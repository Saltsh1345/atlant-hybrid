create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null,
  sport text not null check (sport in ('strength', 'boxing', 'tennis')),
  exercise text,
  duration_sec integer not null default 0 check (duration_sec >= 0),
  avg_velocity double precision,
  peak_velocity double precision,
  form_score integer check (form_score is null or form_score between 0 and 100),
  reps integer,
  summary jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workout_sessions_user_completed_idx
  on public.workout_sessions (user_id, completed_at desc);

alter table public.workout_sessions enable row level security;

drop policy if exists "Users can read their own workout sessions" on public.workout_sessions;
create policy "Users can read their own workout sessions"
  on public.workout_sessions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own workout sessions" on public.workout_sessions;
create policy "Users can create their own workout sessions"
  on public.workout_sessions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  source text not null check (source in ('gemini', 'fallback')),
  title text not null,
  focus text not null,
  duration_min integer not null default 30 check (duration_min between 5 and 180),
  exercises jsonb not null,
  tips jsonb not null default '[]'::jsonb,
  target_meshes jsonb not null default '[]'::jsonb,
  not_recovered_groups jsonb not null default '[]'::jsonb,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_date)
);

create index if not exists workout_plans_user_date_idx
  on public.workout_plans (user_id, plan_date desc);

alter table public.workout_plans enable row level security;

drop policy if exists "Users can read their own workout plans" on public.workout_plans;
create policy "Users can read their own workout plans"
  on public.workout_plans
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own workout plans" on public.workout_plans;
create policy "Users can create their own workout plans"
  on public.workout_plans
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own workout plans" on public.workout_plans;
create policy "Users can update their own workout plans"
  on public.workout_plans
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
