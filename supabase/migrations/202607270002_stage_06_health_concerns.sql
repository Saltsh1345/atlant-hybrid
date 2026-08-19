-- Этап 6 — health_concerns в опроснике (структурированные ограничения клиента)

alter table public.user_training_intake
  add column if not exists health_concerns jsonb not null default '[]'::jsonb;

comment on column public.user_training_intake.health_concerns is
  'Массив id ограничений: lower_back, knee, shoulder, neck, hip, wrist_elbow, post_surgery, general_mobility';
