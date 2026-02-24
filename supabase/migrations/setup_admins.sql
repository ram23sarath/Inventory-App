-- Create a table for admins
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now() not null
);

-- Enable RLS on admins table (allow everyone to read to check admin status)
alter table public.admins enable row level security;

drop policy if exists "Admins are viewable by everyone" on public.admins;
create policy "Admins are viewable by everyone" on public.admins
  for select using (true);

-- Update items table RLS policies to allow admins full access
-- First drop existing policies (both old and new versions for idempotency)
drop policy if exists "Users can select their own items" on public.items;
drop policy if exists "Users can insert their own items" on public.items;
drop policy if exists "Users can update their own items" on public.items;
drop policy if exists "Users can delete their own items" on public.items;
drop policy if exists "Users can select own items OR admins can select all" on public.items;
drop policy if exists "Users can insert own items OR admins can insert all" on public.items;
drop policy if exists "Users can update own items OR admins can update all" on public.items;
drop policy if exists "Users can delete own items OR admins can delete all" on public.items;

-- Re-create policies with admin override
create policy "Users can select own items OR admins can select all"
  on public.items for select
  using (
    auth.uid() = user_id 
    OR 
    exists (select 1 from public.admins where user_id = auth.uid())
  );

create policy "Users can insert own items OR admins can insert all"
  on public.items for insert
  with check (
    auth.uid() = user_id 
    OR 
    exists (select 1 from public.admins where user_id = auth.uid())
  );

create policy "Users can update own items OR admins can update all"
  on public.items for update
  using (
    auth.uid() = user_id 
    OR 
    exists (select 1 from public.admins where user_id = auth.uid())
  )
  with check (
    auth.uid() = user_id 
    OR 
    exists (select 1 from public.admins where user_id = auth.uid())
  );

create policy "Users can delete own items OR admins can delete all"
  on public.items for delete
  using (
    auth.uid() = user_id 
    OR 
    exists (select 1 from public.admins where user_id = auth.uid())
  );

-- Instructions:
-- To add an admin, run:
-- insert into public.admins (user_id) values ('USER_ID_GOES_HERE');
