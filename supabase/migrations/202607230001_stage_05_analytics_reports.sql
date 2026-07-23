create table if not exists public.analytics_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  tonnage_kg double precision not null default 0 check (tonnage_kg >= 0),
  calories_est integer not null default 0 check (calories_est >= 0),
  peak_angles jsonb not null default '{}'::jsonb,
  zones jsonb not null default '[]'::jsonb,
  gemini_summary text,
  gemini_source text check (gemini_source is null or gemini_source in ('gemini', 'fallback')),
  created_at timestamptz not null default now(),
  unique (user_id, session_id)
);

create index if not exists analytics_reports_user_created_idx
  on public.analytics_reports (user_id, created_at desc);

alter table public.analytics_reports enable row level security;

drop policy if exists "Users can read their own analytics reports" on public.analytics_reports;
create policy "Users can read their own analytics reports"
  on public.analytics_reports
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own analytics reports" on public.analytics_reports;
create policy "Users can create their own analytics reports"
  on public.analytics_reports
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own analytics reports" on public.analytics_reports;
create policy "Users can update their own analytics reports"
  on public.analytics_reports
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
