-- Meet Lounge: realtime and storage. Guarded so the file also runs on a plain Postgres (tests).

-- Live order status for customers and the dashboard (changes still pass through RLS).
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.orders;
    alter publication supabase_realtime add table public.coin_ledger;
    alter publication supabase_realtime add table public.offers;
  end if;
end $$;

-- Pictures: one public bucket for menu images and the hero image, writable by the owner only.
do $$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('menu-images', 'menu-images', true, 2621440, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
    on conflict (id) do update set public = true, file_size_limit = 2621440,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

    execute 'create policy "menu images are public" on storage.objects for select to anon, authenticated using (bucket_id = ''menu-images'')';
    execute 'create policy "owner uploads menu images" on storage.objects for insert to authenticated with check (bucket_id = ''menu-images'' and public.is_owner())';
    execute 'create policy "owner replaces menu images" on storage.objects for update to authenticated using (bucket_id = ''menu-images'' and public.is_owner())';
    execute 'create policy "owner deletes menu images" on storage.objects for delete to authenticated using (bucket_id = ''menu-images'' and public.is_owner())';
  end if;
end $$;
