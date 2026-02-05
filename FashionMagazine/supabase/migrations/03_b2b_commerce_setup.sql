
-- Add series_quantity to products
alter table products
add column series_quantity integer default 4;

-- Orders Table
create table orders (
  id uuid default uuid_generate_v4() primary key,
  buyer_id uuid references profiles(id) on delete cascade not null,
  shop_id uuid references shops(id) on delete cascade not null,
  status text check (status in ('requested', 'offered', 'approved', 'shipped')) not null default 'requested',
  total_price decimal, -- Nullable initially
  receipt_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Order Items Table
create table order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references orders(id) on delete cascade not null,
  product_id uuid references products(id) on delete cascade not null,
  quantity_series integer not null check (quantity_series > 0),
  agreed_price decimal -- Nullable initially
);

-- Order Extras Table
create table order_extras (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references orders(id) on delete cascade not null,
  description text not null,
  amount decimal not null
);

-- Enable RLS
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_extras enable row level security;

-- Orders Policies
create policy "Users can view their own orders (buyer or shop owner)."
  on orders for select
  using (
    auth.uid() = buyer_id or
    exists (select 1 from shops where id = shop_id and owner_id = auth.uid())
  );

create policy "Buyers can insert orders."
  on orders for insert
  with check ( auth.uid() = buyer_id );

create policy "Shop owners can update orders (e.g. status, price)."
  on orders for update
  using ( exists (select 1 from shops where id = shop_id and owner_id = auth.uid()) );

create policy "Buyers can update orders (e.g. approve)."
  on orders for update
  using ( auth.uid() = buyer_id );

-- Order Items Policies
create policy "Users can view items of visible orders."
  on order_items for select
  using ( exists (select 1 from orders where id = order_id and (buyer_id = auth.uid() or exists (select 1 from shops s where s.id = orders.shop_id and s.owner_id = auth.uid()))) );

create policy "Buyers can insert order items."
  on order_items for insert
  with check ( exists (select 1 from orders where id = order_id and buyer_id = auth.uid()) );

create policy "Shop owners can update order items (agreed price)."
  on order_items for update
  using ( exists (select 1 from orders o join shops s on o.shop_id = s.id where o.id = order_id and s.owner_id = auth.uid()) );

-- Order Extras Policies
create policy "Users can view extras of visible orders."
  on order_extras for select
  using ( exists (select 1 from orders where id = order_id and (buyer_id = auth.uid() or exists (select 1 from shops s where s.id = orders.shop_id and s.owner_id = auth.uid()))) );

create policy "Shop owners can insert/update/delete extras."
  on order_extras for all
  using ( exists (select 1 from orders o join shops s on o.shop_id = s.id where o.id = order_id and s.owner_id = auth.uid()) );
