-- Meet Lounge: row-level security. Every table has RLS on. Browser keys can only do what these policies and grants allow.

alter table public.profiles           enable row level security;
alter table public.menu_items         enable row level security;
alter table public.offers             enable row level security;
alter table public.settings           enable row level security;
alter table public.orders             enable row level security;
alter table public.order_items        enable row level security;
alter table public.coin_ledger        enable row level security;
alter table public.push_subscriptions enable row level security;

-- Start from nothing, then grant exactly what the app needs.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.menu_items, public.offers, public.settings to anon, authenticated;
grant select on public.profiles, public.orders, public.order_items, public.coin_ledger, public.push_subscriptions to authenticated;
grant update (display_name, phone, locale) on public.profiles to authenticated;
grant insert, delete on public.push_subscriptions to authenticated;
grant update (status) on public.orders to authenticated;                       -- staff only, by policy; moves are checked by a trigger
grant insert, update, delete on public.menu_items, public.offers to authenticated;   -- owner only, by policy
grant update on public.settings to authenticated;                              -- owner only, by policy

grant execute on function public.is_staff(), public.is_owner() to anon, authenticated;
grant execute on function public.my_balance(), public.create_order(jsonb, public.order_mode, text, text, text),
  public.advance_order(uuid), public.cancel_order(uuid), public.adjust_coins(uuid, integer, text),
  public.set_role(uuid, public.user_role), public.next_status(public.order_mode, public.order_status) to authenticated;

-- profiles
create policy profiles_read   on public.profiles for select to authenticated using (id = auth.uid() or public.is_staff());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- menu_items: everyone reads what is not archived; staff see all; only the owner writes
create policy menu_read   on public.menu_items for select to anon, authenticated using (not archived or public.is_staff());
create policy menu_insert on public.menu_items for insert to authenticated with check (public.is_owner());
create policy menu_update on public.menu_items for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy menu_delete on public.menu_items for delete to authenticated using (public.is_owner());

-- offers: everyone reads active ones; the owner manages
create policy offers_read   on public.offers for select to anon, authenticated
  using ((active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())) or public.is_owner());
create policy offers_insert on public.offers for insert to authenticated with check (public.is_owner());
create policy offers_update on public.offers for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy offers_delete on public.offers for delete to authenticated using (public.is_owner());

-- settings: readable by everyone (no secrets in it), writable by the owner
create policy settings_read   on public.settings for select to anon, authenticated using (true);
create policy settings_update on public.settings for update to authenticated using (public.is_owner()) with check (public.is_owner());

-- orders: own orders or staff; no insert policy at all (orders are created only by create_order); staff may change status
create policy orders_read   on public.orders for select to authenticated using (customer_id = auth.uid() or public.is_staff());
create policy orders_update on public.orders for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy order_items_read on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.is_staff())));

-- coin ledger: read your own (owner reads all); no insert/update/delete policy, so only the functions and triggers can write it
create policy ledger_read on public.coin_ledger for select to authenticated using (customer_id = auth.uid() or public.is_owner());

-- push subscriptions: your own only
create policy push_read   on public.push_subscriptions for select to authenticated using (customer_id = auth.uid());
create policy push_insert on public.push_subscriptions for insert to authenticated with check (customer_id = auth.uid());
create policy push_delete on public.push_subscriptions for delete to authenticated using (customer_id = auth.uid());
