-- Growth: a calendar of things to do. A timed block (starts_at to ends_at),
-- or a to-do for a day with no time (day). Either can be ticked off.
create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null check (char_length(title) between 1 and 200),
  notes text check (char_length(notes) <= 2000),
  -- One of the goal colours (red, orange, yellow, green, teal, blue, purple, pink).
  color text not null default 'blue',
  starts_at timestamptz,
  ends_at timestamptz,
  day date,
  done_at timestamptz,
  check (
    (day is null and starts_at is not null and ends_at > starts_at)
    or (day is not null and starts_at is null and ends_at is null)
  )
);

create index calendar_events_starts_at_idx on calendar_events (starts_at);
create index calendar_events_day_idx on calendar_events (day);

alter table calendar_events enable row level security;
