create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  weight_kg double precision check (weight_kg between 20 and 400),
  height_cm double precision check (height_cm between 80 and 250),
  age integer check (age between 13 and 120),
  resting_heart_rate_bpm double precision
    check (resting_heart_rate_bpm between 25 and 240),
  body_fat_percentage double precision
    check (body_fat_percentage between 1 and 75),
  health_provider text check (
    health_provider is null or health_provider in ('huawei', 'google_fit', 'apple_health')
  ),
  health_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
