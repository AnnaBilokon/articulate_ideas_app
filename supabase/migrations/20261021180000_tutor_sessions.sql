-- Socratic tutor conversations: the tutor asks one question at a time and
-- the learner works the ideas out. The whole conversation is kept as a list
-- of turns ({role: "tutor" | "learner", text}), with the summary at the end.
create table tutor_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  topic_id uuid not null references topics (id) on delete cascade,
  messages jsonb not null default '[]',
  done boolean not null default false,
  -- What the learner worked out, as short points; null until done.
  summary text[]
);

create index tutor_sessions_topic_id_idx on tutor_sessions (topic_id);

alter table tutor_sessions enable row level security;
