-- Meet Lounge: web push registration. One browser endpoint belongs to whoever registered it last
-- (a guest who signs up, or two people sharing a phone), so registration is a function, not a plain insert.
create function public.register_push(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not-authenticated' using errcode = '28000'; end if;
  if length(p_endpoint) not between 20 and 1000 or p_endpoint !~ '^https://' or length(p_p256dh) > 200 or length(p_auth) > 100 then
    raise exception 'bad-option';
  end if;
  insert into public.push_subscriptions (customer_id, endpoint, p256dh, auth) values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update set customer_id = excluded.customer_id, p256dh = excluded.p256dh, auth = excluded.auth;
end $$;

revoke all on function public.register_push(text, text, text) from public, anon;
grant execute on function public.register_push(text, text, text) to authenticated;

-- A customer may only remove their own registrations (the app unsubscribes by endpoint).
-- Direct inserts are no longer needed.
revoke insert on public.push_subscriptions from authenticated;
drop policy if exists push_insert on public.push_subscriptions;
