-- Save the optional customer registration details with each customer's profile.
alter table public.profiles
  add column if not exists seat text check (seat is null or char_length(seat) <= 160);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, phone, seat)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'name', ''), 60), ''),
    nullif(left(coalesce(new.raw_user_meta_data ->> 'phone', ''), 20), ''),
    nullif(left(coalesce(new.raw_user_meta_data ->> 'seat', ''), 160), '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

create function public.handle_user_profile_metadata() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set display_name = nullif(left(coalesce(new.raw_user_meta_data ->> 'name', ''), 60), ''),
         phone = nullif(left(coalesce(new.raw_user_meta_data ->> 'phone', ''), 20), ''),
         seat = nullif(left(coalesce(new.raw_user_meta_data ->> 'seat', ''), 160), '')
   where id = new.id;
  return new;
end $$;

revoke all on function public.handle_user_profile_metadata() from public, anon, authenticated;

create trigger on_auth_user_metadata_updated
after update of raw_user_meta_data on auth.users
for each row
when (old.raw_user_meta_data is distinct from new.raw_user_meta_data)
execute function public.handle_user_profile_metadata();
