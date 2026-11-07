-- Goals: a checklist inside a step, worked through one by one ("Kitchen":
-- wipe the counters, clean the oven, mop the floor). The step ticks itself
-- once every item on its list is done.
create table goal_step_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  step_id uuid not null references goal_steps (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  position integer not null default 0,
  done_at timestamptz
);

create index goal_step_items_step_id_idx on goal_step_items (step_id, position);

alter table goal_step_items enable row level security;
