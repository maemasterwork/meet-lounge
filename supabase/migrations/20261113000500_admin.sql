-- Meet Lounge: owner dashboard helpers.

-- One row per customer with balance and order count. Owner only (raises for anyone else).
create function public.owner_customers() returns table (id uuid, name text, phone text, balance integer, orders integer)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'not-allowed' using errcode = '42501'; end if;
  return query
    select p.id, p.display_name,
           coalesce(p.phone, (select o.guest_phone from public.orders o where o.customer_id = p.id and o.guest_phone is not null order by o.created_at desc limit 1)),
           coalesce((select sum(l.delta) from public.coin_ledger l where l.customer_id = p.id), 0)::integer,
           (select count(*) from public.orders o where o.customer_id = p.id and o.status <> 'cancelled')::integer
      from public.profiles p
     where p.role = 'customer'
       and (exists (select 1 from public.orders o where o.customer_id = p.id) or exists (select 1 from public.coin_ledger l where l.customer_id = p.id))
     order by 4 desc, 5 desc
     limit 500;
end $$;

revoke all on function public.owner_customers() from public, anon;
grant execute on function public.owner_customers() to authenticated;
