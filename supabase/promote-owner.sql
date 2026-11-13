-- Run once in the Supabase SQL editor AFTER you have signed up in the app with the owner's email.
-- Replace the address, run it, then sign out and in again. Staff accounts use role 'staff'.
update public.profiles set role = 'owner'
where id = (select id from auth.users where email = 'owner@example.com');
-- check:  select p.role, u.email from public.profiles p join auth.users u on u.id = p.id where p.role <> 'customer';
