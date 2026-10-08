-- Vocabulary: words and phrases the learner wants to remember, saved from a
-- lesson or added by hand. Claude writes a plain definition, how to use it,
-- example sentences and a Ukrainian translation. Words are practiced on their
-- own spaced schedule, separate from topic reviews.
create table vocabulary_words (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  word text not null check (char_length(word) between 1 and 100),
  part_of_speech text,
  definition text not null,
  -- How to use it: common patterns, register, mistakes to avoid.
  usage_note text,
  examples text[] not null default '{}',
  -- Ukrainian translation.
  translation text,
  -- Where it was saved from, if from a lesson: the topic and the sentence around it.
  topic_id uuid references topics (id) on delete set null,
  context text check (char_length(context) <= 1000),
  -- Practice schedule: the same ladder as review_state. New words are due right away.
  due_at timestamptz not null default now(),
  interval_days integer not null default 0,
  step smallint not null default 0,
  last_score smallint check (last_score between 0 and 5)
);

-- One entry per word, ignoring case.
create unique index vocabulary_words_word_idx on vocabulary_words (lower(word));
create index vocabulary_words_due_at_idx on vocabulary_words (due_at);

-- Every practice answer, like attempts for recall questions.
create table vocabulary_attempts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  word_id uuid not null references vocabulary_words (id) on delete cascade,
  answer text not null,
  confidence smallint not null check (confidence between 1 and 3),
  score smallint not null check (score between 0 and 5),
  feedback jsonb not null,
  duration_sec integer check (duration_sec >= 0)
);

create index vocabulary_attempts_word_id_idx on vocabulary_attempts (word_id);

alter table vocabulary_words enable row level security;
alter table vocabulary_attempts enable row level security;
