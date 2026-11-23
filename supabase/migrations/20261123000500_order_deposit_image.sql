-- Customers may attach a private, optional deposit proof while their order is awaiting payment.
alter table public.orders add column if not exists deposit_image_path text;
grant update (deposit_image_path) on public.orders to authenticated;

create policy orders_deposit_image_update on public.orders for update to authenticated
  using (customer_id = auth.uid() and status = 'new' and paid_at is null)
  with check (
    customer_id = auth.uid() and status = 'new' and paid_at is null
    and (deposit_image_path is null or deposit_image_path = auth.uid()::text || '/' || id::text || '/proof')
  );

-- Deposit proofs are not public like menu pictures. Customers can access only their own order's image;
-- staff can view uploaded proofs when reviewing orders.
do $$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('deposit-images', 'deposit-images', false, 2621440, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
    on conflict (id) do update set public = false, file_size_limit = 2621440,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

    execute $policy$
      create policy "customers and staff read deposit proofs" on storage.objects for select to authenticated
      using (
        bucket_id = 'deposit-images' and (
          public.is_staff() or exists (
            select 1 from public.orders o
            where o.customer_id = auth.uid()
              and o.id::text = (storage.foldername(name))[2]
              and o.deposit_image_path = name
          )
        )
      )
    $policy$;
    execute $policy$
      create policy "customers upload their pending order deposit proof" on storage.objects for insert to authenticated
      with check (
        bucket_id = 'deposit-images'
        and (storage.foldername(name))[1] = auth.uid()::text
        and (storage.filename(name)) = 'proof'
        and exists (
          select 1 from public.orders o
          where o.customer_id = auth.uid()
            and o.id::text = (storage.foldername(name))[2]
            and o.status = 'new' and o.paid_at is null
        )
      )
    $policy$;
    execute $policy$
      create policy "customers replace their pending order deposit proof" on storage.objects for update to authenticated
      using (
        bucket_id = 'deposit-images'
        and (storage.foldername(name))[1] = auth.uid()::text
        and (storage.filename(name)) = 'proof'
        and exists (
          select 1 from public.orders o
          where o.customer_id = auth.uid()
            and o.id::text = (storage.foldername(name))[2]
            and o.status = 'new' and o.paid_at is null
        )
      )
    $policy$;
  end if;
end $$;
