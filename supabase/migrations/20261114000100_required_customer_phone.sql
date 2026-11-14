-- Customer profiles can be edited by their owner; keep seat writable and phone required.
grant update (seat) on public.profiles to authenticated;

create function public.require_customer_profile_phone() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_is_anonymous boolean;
begin
  select is_anonymous into v_is_anonymous from auth.users where id = new.id;
  if not coalesce(v_is_anonymous, false) and nullif(btrim(new.phone), '') is null then
    raise exception 'phone-required';
  end if;
  return new;
end $$;

revoke all on function public.require_customer_profile_phone() from public, anon, authenticated;

create trigger require_customer_profile_phone
before insert or update of display_name, phone, seat on public.profiles
for each row execute function public.require_customer_profile_phone();
