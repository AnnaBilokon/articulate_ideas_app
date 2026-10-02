-- MVP schema for the learning coach. See "Data model" in PLAN.md.
--
-- Access model: only the Next.js server talks to the database, using the
-- secret key, which bypasses row-level security. RLS is enabled on every
-- table with no policies, so the public API keys can read or write nothing.

-- Settings: a single row (id is always 1).
create table settings (
  id smallint primary key default 1 check (id = 1),
  created_at timestamptz not null default now(),
  interests text[] not null default '{}',
  daily_review_cap integer not null default 20 check (daily_review_cap > 0),
  -- Share of suggestions that should be new territory (0.2 = 80% familiar, 20% new).
  exploration_ratio real not null default 0.2 check (exploration_ratio between 0 and 1)
);

insert into settings (id) values (1);

create table topics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  level text,
  status text not null default 'learning' check (status in ('inbox', 'learning', 'learned')),
  interest_rating smallint check (interest_rating between 1 and 3),
  -- Null until the lesson is done.
  mastery_level text check (mastery_level in ('seen', 'recalled', 'explained', 'applied')),
  researched_at timestamptz
);

create index topics_status_idx on topics (status);

-- Same format the build_card schema enforces: lowercase words joined by hyphens.
create table tags (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null unique check (name ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table topic_tags (
  topic_id uuid not null references topics (id) on delete cascade,
  tag_id uuid not null references tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (topic_id, tag_id)
);

create index topic_tags_tag_id_idx on topic_tags (tag_id);

-- The user's own questions, plus up to 3 that Claude suggests (is_suggested).
create table user_questions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  topic_id uuid not null references topics (id) on delete cascade,
  position integer not null,
  text text not null,
  is_suggested boolean not null default false,
  answer text
);

create index user_questions_topic_id_idx on user_questions (topic_id);

-- Guesses made before the lesson. Not graded; kept to compare with later recall.
create table pretest_answers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  topic_id uuid not null references topics (id) on delete cascade,
  position integer not null,
  question text not null,
  answer text not null default ''
);

create index pretest_answers_topic_id_idx on pretest_answers (topic_id);

create table sources (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  topic_id uuid not null references topics (id) on delete cascade,
  url text not null,
  title text not null
);

create index sources_topic_id_idx on sources (topic_id);

create table lesson_chunks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  topic_id uuid not null references topics (id) on delete cascade,
  position integer not null,
  title text not null,
  content text not null,
  unique (topic_id, position)
);

-- One card per topic. The embedding column is added in Phase 4, once the
-- embedding model (and so the vector size) is chosen.
create table topic_cards (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  topic_id uuid not null unique references topics (id) on delete cascade,
  one_sentence text not null,
  paragraph text not null,
  analogy text not null,
  counterpoint text not null,
  connects_to text[] not null default '{}',
  notes text
);

create table recall_questions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  topic_id uuid not null references topics (id) on delete cascade,
  position integer not null,
  text text not null,
  key_points text[] not null check (cardinality(key_points) between 2 and 5),
  type text not null check (type in ('why', 'how', 'compare', 'apply'))
);

create index recall_questions_topic_id_idx on recall_questions (topic_id);

-- One schedule row per recall question. stability and difficulty are for FSRS (V2).
create table review_state (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  question_id uuid not null unique references recall_questions (id) on delete cascade,
  due_at timestamptz not null,
  interval_days integer not null default 1,
  step smallint not null default 0,
  stability real,
  difficulty real,
  last_score smallint check (last_score between 0 and 5)
);

create index review_state_due_at_idx on review_state (due_at);

create table attempts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  question_id uuid not null references recall_questions (id) on delete cascade,
  mode text not null check (mode in ('quiz', 'review')),
  answer text not null,
  confidence smallint not null check (confidence between 1 and 3),
  score smallint not null check (score between 0 and 5),
  feedback jsonb not null,
  duration_sec integer check (duration_sec >= 0)
);

create index attempts_question_id_idx on attempts (question_id);

create table dumps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  topic_id uuid not null references topics (id) on delete cascade,
  text text not null,
  feedback jsonb
);

create index dumps_topic_id_idx on dumps (topic_id);

create table explanations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  topic_id uuid not null references topics (id) on delete cascade,
  text text not null,
  drill_type text,
  feedback jsonb,
  score smallint check (score between 0 and 5)
);

create index explanations_topic_id_idx on explanations (topic_id);

create table suggestions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  mode text not null check (mode in ('more_like_this', 'fill_the_gaps', 'bridge', 'try_something_new')),
  reason text not null,
  difficulty text,
  tags text[] not null default '{}',
  starter_questions text[] not null default '{}',
  status text not null default 'shown' check (status in ('shown', 'accepted', 'dismissed')),
  dismiss_reason text
);

create index suggestions_status_idx on suggestions (status);

alter table settings enable row level security;
alter table topics enable row level security;
alter table tags enable row level security;
alter table topic_tags enable row level security;
alter table user_questions enable row level security;
alter table pretest_answers enable row level security;
alter table sources enable row level security;
alter table lesson_chunks enable row level security;
alter table topic_cards enable row level security;
alter table recall_questions enable row level security;
alter table review_state enable row level security;
alter table attempts enable row level security;
alter table dumps enable row level security;
alter table explanations enable row level security;
alter table suggestions enable row level security;
