create function public.confirm_delivery(p_order_number integer) returns public.orders
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  if auth.uid() is null then raise exception 'not-authenticated' using errcode = '28000'; end if;
  select * into o from public.orders where number = p_order_number for update;
  if not found or o.customer_id <> auth.uid() then raise exception 'not-allowed' using errcode = '42501'; end if;
  if o.mode <> 'delivery' then raise exception 'not-allowed' using errcode = '42501'; end if;
  if o.status = 'done' then return o; end if;
  if o.status <> 'out' then raise exception 'order-closed'; end if;
  update public.orders set status = 'done' where id = o.id returning * into o;
  return o;
end $$;

revoke all on function public.confirm_delivery(integer) from public, anon, authenticated;
grant execute on function public.confirm_delivery(integer) to authenticated;
