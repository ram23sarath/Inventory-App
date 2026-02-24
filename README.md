# Inventory App

A production-ready, mobile-first inventory management web application built with React, TypeScript, Tailwind CSS, and Supabase.

![Mobile First](https://img.shields.io/badge/Mobile-First-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![React](https://img.shields.io/badge/React-18-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-blue)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-green)
![PWA](https://img.shields.io/badge/PWA-Ready-purple)

## Features

- ✅ **Authentication** - Supabase Auth with email/password flow
- ✅ **CRUD Operations** - Add, edit, and delete inventory items
- ✅ **Real-time Sync** - Live updates across multiple devices
- ✅ **Offline Support** - Queue changes and sync when back online
- ✅ **Optimistic UI** - Instant feedback with rollback on errors
- ✅ **Mobile-First** - Touch-friendly UI with 44px+ tap targets
- ✅ **PWA** - Installable with offline viewing capability
- ✅ **Dark Mode** - Respects OS preference with manual toggle
- ✅ **Accessibility** - ARIA labels, keyboard navigation, focus management
- ✅ **Currency Handling** - Cents-based storage to avoid float errors

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (mobile-first utilities)
- **Backend**: Supabase (Postgres + Auth + Realtime)
- **Testing**: Vitest + React Testing Library
- **PWA**: vite-plugin-pwa + Workbox

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account ([supabase.com](https://supabase.com))

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd inventory-app

# Install dependencies
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)

2. Run the database setup SQL in this exact order in Supabase SQL Editor:

```sql
-- 1) Copy contents of supabase/schema.sql and run
-- 2) Copy contents of supabase/migrations/setup_admins.sql and run
```

Or copy the SQL below:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Items table
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null check (char_length(name) > 0 and char_length(name) <= 255),
  price_cents bigint not null check (price_cents >= 0),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes
create index if not exists items_user_id_idx on public.items(user_id);
create index if not exists items_created_at_idx on public.items(created_at desc);

-- Updated at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger items_updated_at
  before update on public.items
  for each row
  execute function public.handle_updated_at();

-- Enable RLS
alter table public.items enable row level security;

-- RLS Policies
create policy "Users can insert their own items"
  on public.items for insert
  with check (auth.uid() = user_id);

create policy "Users can select their own items"
  on public.items for select
  using (auth.uid() = user_id);

create policy "Users can update their own items"
  on public.items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own items"
  on public.items for delete
  using (auth.uid() = user_id);
```

3. Verify required tables exist:

```sql
select to_regclass('public.items') as items_table;
select to_regclass('public.admins') as admins_table;
```

4. Enable Realtime for the items table:
   - Go to Database → Replication
   - Enable realtime for `public.items` table

5. Get your API credentials:
   - Go to Project Settings → API
   - Copy `URL` and `anon public` key

### 3. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your Supabase credentials
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Important: make sure the URL and key are for the same Supabase project where you ran both SQL files above.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Available Scripts

| Command           | Description              |
| ----------------- | ------------------------ |
| `npm run dev`     | Start development server |
| `npm run build`   | Build for production     |
| `npm run preview` | Preview production build |
| `npm run test`    | Run tests                |
| `npm run test:ui` | Run tests with UI        |
| `npm run lint`    | Run ESLint               |

## Project Structure

```
inventory-app/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── AddItemForm.tsx    # Add new item form
│   │   ├── AuthForm.tsx       # Sign in/sign up form
│   │   ├── EmptyState.tsx     # Empty inventory state
│   │   ├── Header.tsx         # App header with theme toggle
│   │   ├── InventoryList.tsx  # Main inventory view
│   │   ├── ItemRow.tsx        # Individual item display/edit
│   │   ├── Spinner.tsx        # Loading spinner
│   │   └── TotalBar.tsx       # Sticky total bar
│   ├── hooks/
│   │   ├── useAuth.tsx        # Authentication context
│   │   ├── useItems.ts        # Items CRUD + realtime
│   │   └── useTheme.tsx       # Dark mode context
│   ├── lib/
│   │   ├── currency.ts        # Currency utils (cents-based)
│   │   ├── offline.ts         # Offline queue + cache
│   │   └── supabase.ts        # Supabase client
│   ├── test/
│   │   ├── setup.ts           # Test setup/mocks
│   │   ├── AddItemForm.test.tsx
│   │   ├── ItemRow.test.tsx
│   │   └── currency.test.ts
│   ├── types/
│   │   └── index.ts           # TypeScript types
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── supabase/
│   ├── schema.sql             # Database schema + RLS
│   └── seed.sql               # Sample data script
├── .env.example
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

## Database Schema

### Items Table

| Column        | Type        | Description                          |
| ------------- | ----------- | ------------------------------------ |
| `id`          | uuid        | Primary key                          |
| `user_id`     | uuid        | Foreign key to auth.users            |
| `name`        | text        | Item name (1-255 chars)              |
| `price_cents` | bigint      | Price in cents (avoids float errors) |
| `created_at`  | timestamptz | Creation timestamp                   |
| `updated_at`  | timestamptz | Last update timestamp                |

### Row Level Security (RLS)

All operations are restricted to the authenticated user's own items:

- **SELECT**: `auth.uid() = user_id`
- **INSERT**: `auth.uid() = user_id`
- **UPDATE**: `auth.uid() = user_id` (both using and with check)
- **DELETE**: `auth.uid() = user_id`

## Seeding Sample Data

After signing up, you can add sample data:

1. Sign up for an account in the app
2. Go to Supabase Dashboard → Authentication → Users
3. Copy your user ID (UUID)
4. Run in SQL Editor:

```sql
insert into public.items (user_id, name, price_cents) values
  ('YOUR_USER_ID', 'MacBook Pro 14"', 199999),
  ('YOUR_USER_ID', 'Dell Monitor 27"', 34999),
  ('YOUR_USER_ID', 'Logitech MX Master 3', 9999),
  ('YOUR_USER_ID', 'Apple Magic Keyboard', 9999),
  ('YOUR_USER_ID', 'USB-C Hub', 4999);
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub

2. Import project in [Vercel](https://vercel.com)

3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. Deploy!

### Netlify

1. Push your code to GitHub

2. Import project in [Netlify](https://netlify.com)

3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

4. Add environment variables in Site settings → Environment variables

5. Deploy!

### Environment Variables for Production

| Variable                 | Description                   |
| ------------------------ | ----------------------------- |
| `VITE_SUPABASE_URL`      | Your Supabase project URL     |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

## Offline Support

The app handles offline scenarios gracefully:

1. **Viewing**: Items are cached in localStorage for offline viewing
2. **Mutations**: Changes are queued and synced when back online
3. **Status**: Visual indicators show sync status and offline mode
4. **Retry**: Manual retry button for failed syncs

## Currency Handling

To avoid floating-point math errors, all prices are:

- **Stored** as integers (cents) in the database
- **Calculated** using integer arithmetic in JavaScript
- **Formatted** only for display using `Intl.NumberFormat`

Example: $19.99 is stored as `1999` cents.

## Accessibility

- Semantic HTML with proper landmarks
- ARIA labels on all interactive elements
- Keyboard navigation support
- Focus management on modal/form interactions
- Touch targets minimum 44px height
- Color contrast compliant
- Screen reader friendly

## Testing

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui
```

Tests include:

- Component rendering tests
- Form validation tests
- Currency calculation tests
- User interaction tests

## License

MIT

---

## Acceptance Criteria Checklist

- [x] README.md with setup and deployment steps
- [x] `.env.example` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [x] Full source code (React + TypeScript + Tailwind)
- [x] SQL file `supabase/schema.sql` with table creation and RLS policies
- [x] Test suite with 3+ tests (render list, add item, compute total)
- [x] `npm run dev` works when env vars are provided
- [x] Deploy instructions for Vercel/Netlify
- [x] Supabase RLS policy examples included

## Setup Commands (Copy-Paste Ready)

```bash
# Complete setup sequence
git clone <your-repo-url>
cd inventory-app
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm run dev
```
