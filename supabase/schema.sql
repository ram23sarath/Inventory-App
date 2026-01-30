-- ============================================
-- Inventory App Database Schema
-- ============================================

-- Enable UUID extension (if not already enabled)
create extension if not exists "uuid-ossp";

-- ============================================
-- Items Table
-- ============================================
-- Stores inventory items for each user
-- price_cents stores prices as integers to avoid floating point errors

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null check (char_length(name) > 0 and char_length(name) <= 255),
  price_cents bigint not null check (price_cents >= 0),
  section text not null default 'income' check (section in ('income', 'expenses')),
  item_date date not null default current_date,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create index for faster queries by user
create index if not exists items_user_id_idx on public.items(user_id);
create index if not exists items_created_at_idx on public.items(created_at desc);
create index if not exists items_date_idx on public.items(item_date desc);
create index if not exists items_user_date_idx on public.items(user_id, item_date desc);

-- ============================================
-- Updated At Trigger
-- ============================================
-- Automatically update the updated_at column

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists items_updated_at on public.items;
create trigger items_updated_at
  before update on public.items
  for each row
  execute function public.handle_updated_at();

-- ============================================
-- Row Level Security (RLS)
-- ============================================
-- Enable RLS on items table
alter table public.items enable row level security;

-- Drop existing policies if they exist (for idempotent migrations)
drop policy if exists "Users can insert their own items" on public.items;
drop policy if exists "Users can select their own items" on public.items;
drop policy if exists "Users can update their own items" on public.items;
drop policy if exists "Users can delete their own items" on public.items;

-- Policy: Users can only INSERT items for themselves
create policy "Users can insert their own items"
  on public.items
  for insert
  with check (auth.uid() = user_id);

-- Policy: Users can only SELECT their own items
create policy "Users can select their own items"
  on public.items
  for select
  using (auth.uid() = user_id);

-- Policy: Users can only UPDATE their own items
create policy "Users can update their own items"
  on public.items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: Users can only DELETE their own items
create policy "Users can delete their own items"
  on public.items
  for delete
  using (auth.uid() = user_id);

-- ============================================
-- Realtime Configuration
-- ============================================
-- Enable realtime for items table (run in Supabase Dashboard if needed)
-- alter publication supabase_realtime add table public.items;

-- ============================================
-- Seed Data (Optional - for testing)
-- ============================================
-- Uncomment and modify with a valid user_id to seed test data
-- 
-- insert into public.items (user_id, name, price_cents) values
--   ('YOUR_USER_ID_HERE', 'MacBook Pro', 199999),
--   ('YOUR_USER_ID_HERE', 'Wireless Mouse', 4999),
--   ('YOUR_USER_ID_HERE', 'USB-C Hub', 7999),
--   ('YOUR_USER_ID_HERE', 'Monitor Stand', 12999),
--   ('YOUR_USER_ID_HERE', 'Keyboard', 14999);
