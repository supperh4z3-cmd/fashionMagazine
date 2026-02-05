
-- Enable storage
insert into storage.buckets (id, name, public)
values ('order-receipts', 'order-receipts', true);

-- Policy: Public Read
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'order-receipts' );

-- Policy: Authenticated Insert
create policy "Authenticated Insert"
  on storage.objects for insert
  with check ( bucket_id = 'order-receipts' and auth.role() = 'authenticated' );
