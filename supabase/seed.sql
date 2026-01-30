-- ============================================
-- Seed Data Script
-- ============================================
-- IMPORTANT: You MUST replace 'YOUR_USER_ID' with your actual user UUID
-- 
-- To find your user ID:
-- 1. Go to Supabase Dashboard: https://app.supabase.com
-- 2. Select your project
-- 3. Go to Authentication > Users
-- 4. Copy the UUID (looks like: a1b2c3d4-e5f6-7890-abcd-ef1234567890)
-- 5. Replace all instances of 'YOUR_USER_ID' below with your actual UUID
-- 6. Then run this script in SQL Editor
--
-- Example: If your UUID is 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
-- replace 'YOUR_USER_ID' with that value (keep the quotes)

-- Sample inventory items with dates and sections (prices in cents)
-- Income entries (snacks sold)
insert into public.items (user_id, name, price_cents, section, item_date) values
  ('ec3fcc98-d52c-4082-9da5-05fa5f17d6e9', 'Chips', 5000, 'income', '2026-01-28'),
  ('ec3fcc98-d52c-4082-9da5-05fa5f17d6e9', 'Pallilu', 4500, 'income', '2026-01-28'),
  ('ec3fcc98-d52c-4082-9da5-05fa5f17d6e9', 'ButterMilk', 3000, 'income', '2026-01-29'),
  ('ec3fcc98-d52c-4082-9da5-05fa5f17d6e9', 'Lassi', 3500, 'income', '2026-01-29'),
  ('ec3fcc98-d52c-4082-9da5-05fa5f17d6e9', 'Finger Chips', 6000, 'income', '2026-01-30');

-- Expense entries (purchases)
insert into public.items (user_id, name, price_cents, section, item_date) values
  ('ec3fcc98-d52c-4082-9da5-05fa5f17d6e9', 'Maize', 2500, 'expenses', '2026-01-28'),
  ('ec3fcc98-d52c-4082-9da5-05fa5f17d6e9', 'Popcorn', 2000, 'expenses', '2026-01-28'),
  ('ec3fcc98-d52c-4082-9da5-05fa5f17d6e9', 'Groundnuts', 1500, 'expenses', '2026-01-29'),
  ('ec3fcc98-d52c-4082-9da5-05fa5f17d6e9', 'A1 Snacks', 3000, 'expenses', '2026-01-29'),
  ('ec3fcc98-d52c-4082-9da5-05fa5f17d6e9', 'Others', 1000, 'expenses', '2026-01-30');