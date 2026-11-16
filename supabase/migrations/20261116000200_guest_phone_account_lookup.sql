create function public.lookup_customer_email_by_phone(p_phone text) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_email text;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
begin
  if auth.uid() is null or auth.jwt() ->> 'is_anonymous' is distinct from 'true' then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  if char_length(v_phone) < 6 or char_length(v_phone) > 20 then return null; end if;

  select u.email::text into v_email
    from public.profiles p
    join auth.users u on u.id = p.id
   where p.role = 'customer'
     and u.email is not null
     and not u.is_anonymous
     and regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') = v_phone
   order by p.created_at desc, p.id
   limit 1;
  return v_email;
end $$;

revoke all on function public.lookup_customer_email_by_phone(text) from public, anon;
grant execute on function public.lookup_customer_email_by_phone(text) to authenticated;
