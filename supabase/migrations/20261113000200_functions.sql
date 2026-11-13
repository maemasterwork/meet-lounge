-- Meet Lounge: business logic. Prices, rewards and coins are decided here, never by the browser.

-- ---------- helpers used by policies ----------
create function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('staff', 'owner') from public.profiles where id = auth.uid()), false)
$$;

create function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'owner' from public.profiles where id = auth.uid()), false)
$$;

-- ---------- profile for every new auth user (including anonymous guests) ----------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(left(coalesce(new.raw_user_meta_data ->> 'name', ''), 60), ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------- balance ----------
create function public.my_balance() returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::integer from public.coin_ledger where customer_id = auth.uid()
$$;

-- ---------- create_order ----------
-- p_items: [{"item_id":"latte","size":"small","milk":0,"sugar":1,"qty":2,"reward":false}, ...]
-- Errors (message = code the app maps to text): not-authenticated, shop-closed, empty, bad-mode, address-required,
-- table-required, phone-required, item-unavailable, bad-option, reward-not-allowed, not-enough-coins.
create function public.create_order(
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

  update public.orders set subtotal = v_sub, total = v_sub + v_fee, reward_coins = v_cost
   where id = o.id returning * into o;
  return o;
end $$;

-- ---------- status changes ----------
create function public.next_status(p_mode public.order_mode, p_status public.order_status) returns public.order_status
language sql immutable as $$
  select case
    when p_status = 'new'   then 'prep'
    when p_status = 'prep'  then 'ready'
    when p_status = 'ready' then case when p_mode = 'delivery' then 'out' else 'done' end
    when p_status = 'out'   then 'done'
  end::public.order_status
$$;

-- Only forward moves (or cancel before done) are allowed, whoever makes them.
create function public.orders_guard() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    if old.status in ('done', 'cancelled') then raise exception 'order-closed'; end if;
    if new.status <> 'cancelled' and new.status <> public.next_status(old.mode, old.status) then
      raise exception 'bad-transition';
    end if;
  end if;
  return new;
end $$;

create trigger orders_guard before update on public.orders
for each row execute function public.orders_guard();

-- Coins follow status: one coin when an order is done, reward coins come back when it is cancelled.
-- The unique index (order_id, reason) makes both idempotent.
create function public.orders_coins() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = old.status then return new; end if;
  if new.status = 'done' then
    insert into public.coin_ledger (customer_id, delta, reason, order_id) values (new.customer_id, 1, 'earn', new.id)
    on conflict do nothing;
  elsif new.status = 'cancelled' and new.reward_coins > 0 then
    insert into public.coin_ledger (customer_id, delta, reason, order_id) values (new.customer_id, new.reward_coins, 'refund', new.id)
    on conflict do nothing;
  end if;
  return new;
end $$;

create trigger orders_coins after update of status on public.orders
for each row execute function public.orders_coins();

create function public.advance_order(p_order_id uuid) returns public.orders
language plpgsql security definer set search_path = public as $$
declare o public.orders; nx public.order_status;
begin
  if not public.is_staff() then raise exception 'not-allowed' using errcode = '42501'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'not-found'; end if;
  nx := public.next_status(o.mode, o.status);
  if nx is null then return o; end if;
  update public.orders set status = nx where id = o.id returning * into o;
  return o;
end $$;

-- Staff can cancel any open order; a customer can cancel their own order while it is still new.
create function public.cancel_order(p_order_id uuid) returns public.orders
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'not-found'; end if;
  if not (public.is_staff() or (o.customer_id = auth.uid() and o.status in ('new', 'cancelled'))) then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  if o.status in ('done', 'cancelled') then return o; end if;
  update public.orders set status = 'cancelled' where id = o.id returning * into o;
  return o;
end $$;

-- ---------- owner tools ----------
create function public.adjust_coins(p_customer uuid, p_delta integer, p_note text) returns integer
language plpgsql security definer set search_path = public as $$
declare bal integer;
begin
  if not public.is_owner() then raise exception 'not-allowed' using errcode = '42501'; end if;
  if p_delta = 0 or p_note is null or btrim(p_note) = '' then raise exception 'bad-option'; end if;
  perform 1 from public.profiles where id = p_customer for update;
  if not found then raise exception 'not-found'; end if;
  select coalesce(sum(delta), 0) into bal from public.coin_ledger where customer_id = p_customer;
  if bal + p_delta < 0 then raise exception 'not-enough-coins'; end if;
  insert into public.coin_ledger (customer_id, delta, reason, note, created_by)
  values (p_customer, p_delta, 'adjust', left(btrim(p_note), 200), auth.uid());
  return bal + p_delta;
end $$;

create function public.set_role(p_user uuid, p_role public.user_role) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'not-allowed' using errcode = '42501'; end if;
  if p_user = auth.uid() and p_role <> 'owner' and (select count(*) from public.profiles where role = 'owner') <= 1 then
    raise exception 'last-owner';
  end if;
  update public.profiles set role = p_role where id = p_user;
end $$;
