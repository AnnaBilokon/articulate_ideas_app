-- Growth workspace: habits and the days they were done. A habit is daily,
-- on chosen weekdays, or a number of times a week. Missed days carry no
-- penalty; past days can be ticked off later.
create table habits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null check (char_length(title) between 1 and 120),
  why text check (char_length(why) <= 1000),
  schedule text not null default 'daily' check (schedule in ('daily', 'days', 'weekly')),
  -- ISO weekdays (1 = Monday ... 7 = Sunday) for 'days'.
  days smallint[] not null default '{}' check (days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  -- How many times a week, for 'weekly'.
  times_per_week smallint check (times_per_week between 1 and 7),
  -- Set while the habit is resting; it leaves Today but keeps its history.
  archived_at timestamptz,
  check (schedule <> 'days' or cardinality(days) > 0),
  check (schedule <> 'weekly' or times_per_week is not null)
);

create table habit_checks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  habit_id uuid not null references habits (id) on delete cascade,
  -- The calendar day it was done, in the app's time zone.
  day date not null,
  unique (habit_id, day)
);

create index habit_checks_day_idx on habit_checks (day);

alter table habits enable row level security;
alter table habit_checks enable row level security;
