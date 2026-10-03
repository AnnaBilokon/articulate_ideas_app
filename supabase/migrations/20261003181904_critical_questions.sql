-- Open-ended "Think deeper" questions that go beyond recall. There is no
-- single right answer, so each has things to consider instead of key points.
create table critical_questions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  topic_id uuid not null references topics (id) on delete cascade,
  position integer not null,
  text text not null,
  kind text not null check (
    kind in ('assumptions', 'evidence', 'counterargument', 'implications', 'perspectives', 'transfer')
  ),
  considerations text[] not null check (cardinality(considerations) between 2 and 4),
  unique (topic_id, position)
);

create index critical_questions_topic_id_idx on critical_questions (topic_id);

alter table critical_questions enable row level security;
