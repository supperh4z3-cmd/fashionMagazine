-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles Table
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  role text check (role in ('buyer', 'seller')) not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Shops Table
create table shops (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  description text,
  latitude float not null,
  longitude float not null,
  is_featured boolean default false,
  whatsapp_number text,
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Products Table
create table products (
  id uuid default uuid_generate_v4() primary key,
  shop_id uuid references shops(id) on delete cascade not null,
  images text[] default '{}', -- Array of image URLs
  fabric_type text,
  stock_status boolean default true,
  price decimal,
  is_price_visible boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Conversations Table
create table conversations (
  id uuid default uuid_generate_v4() primary key,
  buyer_id uuid references profiles(id) on delete cascade not null,
  shop_id uuid references shops(id) on delete cascade not null,
  product_id uuid references products(id) on delete set null, -- Optional context
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Messages Table
create table messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references conversations(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS)

-- Enable RLS
alter table profiles enable row level security;
alter table shops enable row level security;
alter table products enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;

-- Profiles Policies
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Shops Policies
create policy "Shops are viewable by everyone."
  on shops for select
  using ( true );

create policy "Users can create shops if they are sellers."
  on shops for insert
  with check ( auth.uid() = owner_id and exists (select 1 from profiles where id = auth.uid() and role = 'seller') );

create policy "Owners can update their own shops."
  on shops for update
  using ( auth.uid() = owner_id );

create policy "Owners can delete their own shops."
  on shops for delete
  using ( auth.uid() = owner_id );

-- Products Policies
create policy "Products are viewable by everyone."
  on products for select
  using ( true );

create policy "Shop owners can insert products."
  on products for insert
  with check ( exists ( select 1 from shops where id = shop_id and owner_id = auth.uid() ) );

create policy "Shop owners can update their own products."
  on products for update
  using ( exists ( select 1 from shops where id = shop_id and owner_id = auth.uid() ) );

create policy "Shop owners can delete their own products."
  on products for delete
  using ( exists ( select 1 from shops where id = shop_id and owner_id = auth.uid() ) );

-- Conversations Policies
create policy "Users can view their own conversations."
  on conversations for select
  using ( auth.uid() = buyer_id or exists ( select 1 from shops where id = shop_id and owner_id = auth.uid() ) );

create policy "Buyers can create conversations."
  on conversations for insert
  with check ( auth.uid() = buyer_id );

-- Messages Policies
create policy "Users can view messages in their conversations."
  on messages for select
  using ( exists ( select 1 from conversations c where c.id = conversation_id and (c.buyer_id = auth.uid() or exists (select 1 from shops s where s.id = c.shop_id and s.owner_id = auth.uid())) ) );

create policy "Users can insert messages in their conversations."
  on messages for insert
  with check (
    auth.uid() = sender_id and
    exists ( select 1 from conversations c where c.id = conversation_id and (c.buyer_id = auth.uid() or exists (select 1 from shops s where s.id = c.shop_id and s.owner_id = auth.uid())) )
  );

-- Auto-create profile on signup trigger (Optional but recommended)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, full_name, avatar_url)
  values (new.id, 'buyer', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on new user creation
-- Note: You need to enable this trigger manually or include it here if you have permissions
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
