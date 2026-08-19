-- Этап 6 — умный тренинг: опросник, программы, детальный лог подходов

create table if not exists public.user_training_intake (
  user_id uuid primary key references auth.users(id) on delete cascade,
  primary_goal text not null check (
    primary_goal in (
      'lose_weight',
      'gain_muscle',
      'strength',
      'health',
      'performance',
      'recomposition'
    )
  ),
  experience_level text not null check (
    experience_level in ('beginner', 'intermediate', 'advanced')
  ),
  training_location text not null check (
    training_location in ('home', 'gym', 'both')
  ),
  days_per_week integer not null check (days_per_week between 2 and 6),
  program_weeks_requested integer check (
    program_weeks_requested is null
    or program_weeks_requested in (4, 6, 8, 12)
  ),
  program_weeks_suggested integer not null check (
    program_weeks_suggested between 4 and 12
  ),
  program_weeks_final integer not null check (program_weeks_final between 4 and 12),
  let_ai_suggest_weeks boolean not null default false,
  notes text,
  completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_training_intake enable row level security;

drop policy if exists "Users can read their own training intake" on public.user_training_intake;
create policy "Users can read their own training intake"
  on public.user_training_intake
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can upsert their own training intake" on public.user_training_intake;
create policy "Users can upsert their own training intake"
  on public.user_training_intake
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own training intake" on public.user_training_intake;
create policy "Users can update their own training intake"
  on public.user_training_intake
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.training_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  primary_goal text not null,
  experience_level text not null,
  training_location text not null,
  weeks_total integer not null check (weeks_total between 4 and 12),
  current_week integer not null default 1 check (current_week >= 1),
  program_json jsonb not null default '{}'::jsonb,
  source text not null check (source in ('engine', 'gemini', 'hybrid')),
  intake_snapshot jsonb,
  scan_snapshot jsonb,
  status text not null default 'active' check (
    status in ('active', 'completed', 'paused')
  ),
  started_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_programs_user_status_idx
  on public.training_programs (user_id, status, created_at desc);

alter table public.training_programs enable row level security;

drop policy if exists "Users can read their own training programs" on public.training_programs;
create policy "Users can read their own training programs"
  on public.training_programs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own training programs" on public.training_programs;
create policy "Users can create their own training programs"
  on public.training_programs
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own training programs" on public.training_programs;
create policy "Users can update their own training programs"
  on public.training_programs
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public.workout_plans
  add column if not exists program_id uuid references public.training_programs(id) on delete set null,
  add column if not exists week_index integer,
  add column if not exists day_index integer;

alter table public.workout_sessions
  add column if not exists plan_id uuid references public.workout_plans(id) on delete set null,
  add column if not exists program_id uuid references public.training_programs(id) on delete set null,
  add column if not exists session_status text not null default 'completed' check (
    session_status in ('in_progress', 'completed', 'abandoned')
  );

create table if not exists public.workout_session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null,
  exercise_name text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  planned_sets jsonb not null default '[]'::jsonb,
  target_muscles jsonb not null default '[]'::jsonb,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists workout_session_exercises_session_idx
  on public.workout_session_exercises (session_id, sort_order);

alter table public.workout_session_exercises enable row level security;

drop policy if exists "Users can read their own session exercises" on public.workout_session_exercises;
create policy "Users can read their own session exercises"
  on public.workout_session_exercises
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own session exercises" on public.workout_session_exercises;
create policy "Users can create their own session exercises"
  on public.workout_session_exercises
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own session exercises" on public.workout_session_exercises;
create policy "Users can update their own session exercises"
  on public.workout_session_exercises
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.workout_set_logs (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.workout_session_exercises(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  set_index integer not null check (set_index >= 0),
  planned_reps integer,
  actual_reps integer check (actual_reps is null or actual_reps >= 0),
  weight_kg double precision check (weight_kg is null or weight_kg between 0 and 500),
  rest_sec_after integer check (rest_sec_after is null or rest_sec_after >= 0),
  avg_velocity_ms double precision,
  rpe integer check (rpe is null or rpe between 6 and 10),
  skipped boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists workout_set_logs_session_idx
  on public.workout_set_logs (session_id, set_index);

create index if not exists workout_set_logs_user_exercise_idx
  on public.workout_set_logs (user_id, created_at desc);

alter table public.workout_set_logs enable row level security;

drop policy if exists "Users can read their own set logs" on public.workout_set_logs;
create policy "Users can read their own set logs"
  on public.workout_set_logs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own set logs" on public.workout_set_logs;
create policy "Users can create their own set logs"
  on public.workout_set_logs
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own set logs" on public.workout_set_logs;
create policy "Users can update their own set logs"
  on public.workout_set_logs
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
