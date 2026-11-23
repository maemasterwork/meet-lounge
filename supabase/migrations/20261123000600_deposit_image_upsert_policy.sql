-- Storage upsert checks read access to the existing object before replacing it. Permit access
-- inside a customer's own pending-order folder even before the first upload path is linked.
do $$ begin
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists "customers and staff read deposit proofs" on storage.objects';
    execute $policy$
      create policy "customers and staff read deposit proofs" on storage.objects for select to authenticated
      using (
        bucket_id = 'deposit-images' and (
          public.is_staff() or exists (
            select 1 from public.orders o
            where o.customer_id = auth.uid()
              and o.id::text = (storage.foldername(name))[2]
              and (
                o.deposit_image_path = name
                or (o.status = 'new' and o.paid_at is null)
              )
          )
        )
      )
    $policy$;

    execute 'drop policy if exists "customers replace their pending order deposit proof" on storage.objects';
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
  end if;
end $$;
