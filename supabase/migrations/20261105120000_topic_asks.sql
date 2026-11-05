-- Questions asked while learning, under a lesson part or on the Topic Card.
-- Each row is one thread: the first question and its follow-ups, answered by
-- Claude. A thread can become a review question, or an idea to learn later.
create table topic_asks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  topic_id uuid not null references topics (id) on delete cascade,
  -- The lesson part it was asked under; null when asked on the card.
  chunk_id uuid references lesson_chunks (id) on delete set null,
  -- [{ "kind", "question", "answer", "beyond_lesson" }], oldest first.
  turns jsonb not null check (jsonb_typeof(turns) = 'array'),
  -- A review question drafted from the latest answer ({ text, type, key_points }),
  -- ready for "Add to my reviews"; null when the thread isn't worth reviewing.
  review_draft jsonb,
  -- A short topic title when the question opens a subject of its own.
  new_topic text check (char_length(new_topic) <= 120),
  -- Set once added to the reviews, or saved as an idea.
  recall_question_id uuid references recall_questions (id) on delete set null,
  saved_question_id uuid references saved_questions (id) on delete set null
);

create index topic_asks_topic_id_idx on topic_asks (topic_id, created_at);

alter table topic_asks enable row level security;
