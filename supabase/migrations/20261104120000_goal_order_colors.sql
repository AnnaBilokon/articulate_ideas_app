-- Goals: your own order (drag the priority ones to the top) and a colour each.

alter table goals add column position integer not null default 0;
alter table goals add column color text not null default 'blue'
  check (color in ('red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink'));

-- Keep today's order (newest first) and give each goal its own colour, in the
-- same order new goals pick them.
with ordered as (
  select id, (row_number() over (order by created_at desc) - 1)::integer as n from goals
)
update goals g
set position = o.n,
    color = (array['blue', 'pink', 'green', 'orange', 'purple', 'teal', 'yellow', 'red'])[(o.n % 8) + 1]
from ordered o
where g.id = o.id;

create index goals_position_idx on goals (position);
