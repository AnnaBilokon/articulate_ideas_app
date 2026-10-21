-- Challenges: practice in other formats than free-text recall, made from a
-- topic's lesson on demand (spot the mistake, two truths and a lie, and more
-- kinds later). The content holds the answer key, which is only shown after
-- an attempt. Every attempt is saved, so challenges count toward the streak.
create table challenges (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  topic_id uuid not null references topics (id) on delete cascade,
  kind text not null check (char_length(kind) between 1 and 40),
  content jsonb not null
);

create index challenges_topic_id_idx on challenges (topic_id);

create table challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  challenge_id uuid not null references challenges (id) on delete cascade,
  answer jsonb not null,
  score smallint not null check (score between 0 and 5),
  -- What the learner got right and missed, worked out when it was scored.
  result jsonb not null
);

create index challenge_attempts_challenge_id_idx on challenge_attempts (challenge_id);

alter table challenges enable row level security;
alter table challenge_attempts enable row level security;
