-- Meet Lounge: per-item coins and stock, managed in Dashboard -> Menu.
--   coins_earned : coins a customer earns for each unit of this item once the order is done (default 1)
--   reward_cost  : coins needed to take this item as a free reward (only if reward_eligible)
--   stock        : how many are left; NULL = unlimited. Taken when the order is placed, returned if it is cancelled.

alter table public.menu_items
  add column if not exists coins_earned integer not null default 1 check (coins_earned between 0 and 50),
  add column if not exists reward_cost  integer not null default 6 check (reward_cost between 1 and 200),
  add column if not exists stock        integer check (stock is null or stock between 0 and 100000);

-- Existing items keep today's global rule.
update public.menu_items set reward_cost = (select reward_every from public.settings where id = 1);

alter table public.order_items
  add column if not exists coin_each   integer not null default 0 check (coin_each >= 0),
  add column if not exists stock_taken boolean not null default false;
-- Orders still open when this runs earned 1 coin per order before: keep that promise per paid line.
update public.order_items oi set coin_each = 1
  from public.orders o where o.id = oi.order_id and o.status not in ('done', 'cancelled') and not oi.is_reward;

create or replace function public.create_order(
  p_items   jsonb,
  p_mode    public.order_mode,
  p_table   text default null,
  p_address text default null,
  p_phone   text default null
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  uid        uuid := auth.uid();
  s          public.settings;
  o          public.orders;
  el         jsonb;
  m          public.menu_items;
  sz         jsonb;
  v_size     text;
  v_milk     integer;
  v_sugar    integer;
  v_qty      integer;
  v_reward   boolean;
  v_sur      integer;
  v_base     integer;
  v_pct      integer;
  v_unit     integer;
  v_sub      integer := 0;
  v_cost     integer := 0;
  v_fee      integer := 0;
  v_anon     boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
begin
  if uid is null then raise exception 'not-authenticated' using errcode = '28000'; end if;
  select * into s from public.settings where id = 1;
  if not s.shop_open then raise exception 'shop-closed'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'empty';
  end if;
  if p_mode = 'table' then
    if p_table is null or p_table !~ '^[0-9]{1,3}$' or p_table::integer not between 1 and s.table_count then raise exception 'table-required'; end if;
  elsif p_mode = 'delivery' then
    if p_address is null or btrim(p_address) = '' then raise exception 'address-required'; end if;
    v_fee := s.delivery_fee;
  end if;
  if v_anon and (p_phone is null or btrim(p_phone) = '') then raise exception 'phone-required'; end if;

  -- Serialise this customer's orders so two tabs cannot spend the same coins twice.
  perform 1 from public.profiles where id = uid for update;

  insert into public.orders (customer_id, mode, table_no, address, guest_phone, subtotal, delivery_fee, total)
  values (uid, p_mode, case when p_mode = 'table' then p_table end,
          case when p_mode = 'delivery' then btrim(p_address) end, nullif(btrim(p_phone), ''), 0, v_fee, v_fee)
  returning * into o;

  for el in select * from jsonb_array_elements(p_items) loop
    select * into m from public.menu_items where id = el ->> 'item_id' and not archived for update;
    if not found or not m.available then raise exception 'item-unavailable'; end if;

    v_qty    := coalesce((el ->> 'qty')::integer, 1);
    v_reward := coalesce((el ->> 'reward')::boolean, false);
    v_milk   := case when m.milk_options then coalesce((el ->> 'milk')::integer, 0) else 0 end;
    v_sugar  := case when m.category in ('hot', 'cold') then coalesce((el ->> 'sugar')::integer, 1) else 1 end;
    if v_qty not between 1 and 20 or v_sugar not between 0 and 2 then raise exception 'bad-option'; end if;
    -- Limited stock: take it now (the row is locked), give it back if the order is cancelled.
    if m.stock is not null then
      if m.stock < v_qty then raise exception 'out-of-stock'; end if;
      update public.menu_items set stock = stock - v_qty where id = m.id;
    end if;
    if v_milk < 0 or v_milk >= coalesce(array_length(s.milk_surcharges, 1), 1) then raise exception 'bad-option'; end if;

    if v_reward then
      if not m.reward_eligible or v_qty <> 1 then raise exception 'reward-not-allowed'; end if;
      v_size := m.sizes -> 0 ->> 'key';                 -- rewards are always the first (smallest) size
      v_unit := 0;
      v_cost := v_cost + m.reward_cost;
    else
      v_size := coalesce(el ->> 'size', m.sizes -> 0 ->> 'key');
      select e into sz from jsonb_array_elements(m.sizes) e where e ->> 'key' = v_size;
      if sz is null then raise exception 'bad-option'; end if;
      v_sur  := case when m.milk_options then s.milk_surcharges[v_milk + 1] else 0 end;
      v_base := (round((m.base_price * (sz ->> 'mult')::numeric + v_sur) / 1000.0) * 1000)::integer;
      select max(discount_pct) into v_pct from public.offers
       where item_id = m.id and active and discount_pct > 0
         and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now());
      v_unit := case when v_pct is null then v_base
                     else (round(v_base * (1 - v_pct / 100.0) / 1000.0) * 1000)::integer end;
    end if;

    insert into public.order_items (order_id, item_id, size, milk, sugar, qty, unit_price, is_reward, coin_each, stock_taken)
    values (o.id, m.id, v_size, v_milk, v_sugar, v_qty, v_unit, v_reward, case when v_reward then 0 else m.coins_earned end, m.stock is not null);
    v_sub := v_sub + v_unit * v_qty;
  end loop;

  if v_cost > 0 then
    if (select coalesce(sum(delta), 0) from public.coin_ledger where customer_id = uid) < v_cost then
      raise exception 'not-enough-coins';
    end if;
    insert into public.coin_ledger (customer_id, delta, reason, order_id, created_by)
    values (uid, -v_cost, 'reward', o.id, uid);
  end if;

  -- Nothing to pay (all rewards) or deposits switched off: the order counts as paid and can start right away.
  update public.orders set subtotal = v_sub, total = v_sub + v_fee, reward_coins = v_cost,
         paid_at = case when v_sub + v_fee = 0 or not s.require_deposit then now() end
   where id = o.id returning * into o;
  return o;
end $$;


-- Coins follow status: coins_earned per unit when an order is done (reward lines earn nothing),
-- reward coins and stock come back when it is cancelled. The unique index (order_id, reason) keeps each entry single.
create or replace function public.orders_coins() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_earn integer;
begin
  if new.status = old.status then return new; end if;
  if new.status = 'done' then
    select coalesce(sum(qty * coin_each), 0) into v_earn from public.order_items where order_id = new.id and not is_reward;
    if v_earn > 0 then
      insert into public.coin_ledger (customer_id, delta, reason, order_id) values (new.customer_id, v_earn, 'earn', new.id)
      on conflict do nothing;
    end if;
  elsif new.status = 'cancelled' then
    if new.reward_coins > 0 then
      insert into public.coin_ledger (customer_id, delta, reason, order_id) values (new.customer_id, new.reward_coins, 'refund', new.id)
      on conflict do nothing;
    end if;
    update public.menu_items m set stock = m.stock + t.q
      from (select item_id, sum(qty)::integer q from public.order_items where order_id = new.id and stock_taken group by item_id) t
     where m.id = t.item_id and m.stock is not null;
  end if;
  return new;
end $$;
