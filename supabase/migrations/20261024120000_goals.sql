-- Growth workspace: goals and achievements. A goal can have steps to tick
-- off, a number to reach, progress notes and a target date; all optional.
-- Reaching a goal adds an achievement; wins can be logged on their own too.
create table goals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null check (char_length(title) between 1 and 200),
  -- Why it matters: shown on the goal to come back to.
  why text check (char_length(why) <= 2000),
  status text not null default 'active' check (status in ('active', 'paused', 'achieved', 'let_go')),
  target_date date,
  -- A number to reach, e.g. 12 books: target 12, unit "books".
  metric_target numeric check (metric_target > 0),
  metric_current numeric not null default 0,
  metric_unit text check (char_length(metric_unit) <= 40),
  achieved_at timestamptz
);

create table goal_steps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  goal_id uuid not null references goals (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  position integer not null default 0,
  done_at timestamptz
);

create index goal_steps_goal_id_idx on goal_steps (goal_id, position);

create table goal_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  goal_id uuid not null references goals (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000)
);

create index goal_notes_goal_id_idx on goal_notes (goal_id, created_at);

create table achievements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  achieved_on date not null default current_date,
  title text not null check (char_length(title) between 1 and 200),
  note text check (char_length(note) <= 2000),
  -- The goal it completes or belongs to, if any; one achievement per reached goal.
  goal_id uuid references goals (id) on delete set null,
  from_goal boolean not null default false
);

create unique index achievements_from_goal_idx on achievements (goal_id) where from_goal;
create index achievements_achieved_on_idx on achievements (achieved_on desc);

alter table goals enable row level security;
alter table goal_steps enable row level security;
alter table goal_notes enable row level security;
alter table achievements enable row level security;
