-- Fitness: your own workouts to start again and again (routines), and each
-- set logged with its weight and reps, so 7 reps of a planned 12 is kept as 7.

create table fitness_routines (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 80),
  note text check (char_length(note) <= 1000),
  -- Your order on Today.
  position integer not null default 0
);

create table fitness_routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references fitness_routines (id) on delete cascade,
  exercise_id uuid not null references fitness_exercises (id) on delete cascade,
  position smallint not null default 0,
  -- The plan: sets of reps, of a hold in seconds, or minutes of cardio (in
  -- seconds); a weight to start from when there's no last time yet.
  sets smallint not null default 3 check (sets between 1 and 10),
  reps smallint check (reps between 1 and 100),
  seconds smallint check (seconds between 5 and 7200),
  weight_kg numeric(5, 1) check (weight_kg >= 0 and weight_kg < 1000)
);

create index fitness_routine_exercises_routine_idx on fitness_routine_exercises (routine_id);
create index fitness_routine_exercises_exercise_idx on fitness_routine_exercises (exercise_id);

-- A workout can come from a routine, or be put together as you go.
alter table fitness_workouts add column routine_id uuid references fitness_routines (id) on delete set null;
alter table fitness_workouts drop constraint fitness_workouts_source_check;
alter table fitness_workouts
  add constraint fitness_workouts_source_check check (source in ('rules', 'ai', 'logged', 'routine', 'own'));

create table fitness_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references fitness_workout_exercises (id) on delete cascade,
  position smallint not null default 0,
  -- The plan for this set.
  target_reps smallint check (target_reps between 1 and 100),
  target_seconds smallint check (target_seconds between 5 and 7200),
  -- What you did, kept when the set is ticked off.
  reps smallint check (reps between 0 and 200),
  seconds smallint check (seconds between 0 and 7200),
  weight_kg numeric(5, 1) check (weight_kg >= 0 and weight_kg < 1000),
  done_at timestamptz
);

create index fitness_sets_workout_exercise_idx on fitness_sets (workout_exercise_id);

alter table fitness_routines enable row level security;
alter table fitness_routine_exercises enable row level security;
alter table fitness_sets enable row level security;

-- fitness_workout_exercises.weight_kg and done_at are replaced by the sets;
-- they're dropped in a later migration, once the code that reads them is gone.
