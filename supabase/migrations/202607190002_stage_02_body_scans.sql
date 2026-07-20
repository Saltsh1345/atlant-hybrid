create table if not exists public.body_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  captured_at timestamptz not null,
  stature_cm double precision not null check (stature_cm between 140 and 220),
  hyperlordosis_likely boolean not null default false,
  posture_confidence text check (
    posture_confidence is null or posture_confidence in ('low', 'medium', 'high')
  ),
  quality_score integer not null check (quality_score between 0 and 100),
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists body_scans_user_captured_idx
  on public.body_scans (user_id, captured_at desc);

alter table public.body_scans enable row level security;

drop policy if exists "Users can read their own body scans" on public.body_scans;
create policy "Users can read their own body scans"
  on public.body_scans
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own body scans" on public.body_scans;
create policy "Users can create their own body scans"
  on public.body_scans
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

alter table public.profiles
  add column if not exists latest_scan_at timestamptz,
  add column if not exists hyperlordosis_likely boolean,
  add column if not exists scan_anthropometrics jsonb;
