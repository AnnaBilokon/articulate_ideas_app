-- Speaking coach: expressions saved from feedback live here, on the
-- Speaking tab, apart from Vocabulary and its scheduled word practice.
-- Exercises bring back the least-used ones; using one again counts.
create table speaking_expressions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expression text not null check (char_length(expression) between 1 and 60),
  meaning text not null,
  example text not null,
  -- The exercise it came from.
  exercise_id uuid references speaking_exercises (id) on delete set null,
  -- Times it came back into an answer or a follow-up.
  times_used integer not null default 0,
  last_used_at timestamptz
);

create unique index speaking_expressions_expression_idx on speaking_expressions (lower(expression));

alter table speaking_expressions enable row level security;
