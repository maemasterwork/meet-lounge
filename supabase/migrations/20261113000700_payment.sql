-- Meet Lounge: payment by card-to-card deposit. The order is registered immediately, but preparation starts only after
-- staff confirm the deposit. The cafe's card number is shown to the customer on the confirmation screen.

alter table public.settings
  add column if not exists payment_card    text check (payment_card is null or payment_card ~ '^[0-9]{16}$'),
  add column if not exists payment_holder  text check (payment_holder is null or length(payment_holder) <= 60),
  add column if not exists require_deposit boolean not null default true;

alter table public.orders add column if not exists paid_at timestamptz;

-- Orders that already finished before this migration count as paid.
update public.orders set paid_at = coalesce(paid_at, updated_at) where status in ('prep', 'ready', 'out', 'done') and paid_at is null;

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
  v_rewards  integer := 0;
  v_cost     integer;
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
    select * into m from public.menu_items where id = el ->> 'item_id' and not archived;
    if not found or not m.available then raise exception 'item-unavailable'; end if;

    v_qty    := coalesce((el ->> 'qty')::integer, 1);
    v_reward := coalesce((el ->> 'reward')::boolean, false);
    v_milk   := case when m.milk_options then coalesce((el ->> 'milk')::integer, 0) else 0 end;
    v_sugar  := case when m.category in ('hot', 'cold') then coalesce((el ->> 'sugar')::integer, 1) else 1 end;
    if v_qty not between 1 and 20 or v_sugar not between 0 and 2 then raise exception 'bad-option'; end if;
    if v_milk < 0 or v_milk >= coalesce(array_length(s.milk_surcharges, 1), 1) then raise exception 'bad-option'; end if;

    if v_reward then
      if not m.reward_eligible or v_qty <> 1 then raise exception 'reward-not-allowed'; end if;
      v_size := m.sizes -> 0 ->> 'key';                 -- rewards are always the first (smallest) size
      v_unit := 0;
      v_rewards := v_rewards + 1;
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

    insert into public.order_items (order_id, item_id, size, milk, sugar, qty, unit_price, is_reward)
    values (o.id, m.id, v_size, v_milk, v_sugar, v_qty, v_unit, v_reward);
    v_sub := v_sub + v_unit * v_qty;
  end loop;

  v_cost := v_rewards * s.reward_every;
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

create or replace function public.orders_guard() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    if old.status in ('done', 'cancelled') then raise exception 'order-closed'; end if;
    if new.status <> 'cancelled' and new.status <> public.next_status(old.mode, old.status) then
      raise exception 'bad-transition';
    end if;
    -- Preparation starts after the deposit: staff confirm it with mark_paid() first.
    if old.status = 'new' and new.status = 'prep' and new.paid_at is null then
      raise exception 'deposit-required';
    end if;
  end if;
  return new;
end $$;


-- Staff confirm that the deposit arrived. Safe to press twice.
create function public.mark_paid(p_order_id uuid) returns public.orders
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  if not public.is_staff() then raise exception 'not-allowed' using errcode = '42501'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'not-found'; end if;
  if o.status = 'cancelled' then raise exception 'order-closed'; end if;
  if o.paid_at is null then update public.orders set paid_at = now() where id = o.id returning * into o; end if;
  return o;
end $$;

revoke all on function public.mark_paid(uuid) from public, anon;
grant execute on function public.mark_paid(uuid) to authenticated;
