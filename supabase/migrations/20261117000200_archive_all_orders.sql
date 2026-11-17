create function public.archive_all_orders() returns integer
language plpgsql security definer set search_path = public as $$
declare archived_count integer;
begin
  if not public.is_staff() then raise exception 'not-allowed' using errcode = '42501'; end if;
  update public.orders set archived = true where not archived;
  get diagnostics archived_count = row_count;
  return archived_count;
end $$;

revoke all on function public.archive_all_orders() from public, anon, authenticated;
grant execute on function public.archive_all_orders() to authenticated;
