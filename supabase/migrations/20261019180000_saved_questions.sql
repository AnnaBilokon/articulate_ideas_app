-- Think deeper answers: the learner writes an answer to an open question
-- first, then gets feedback, a fuller answer and the strongest
-- counterargument. Rebuilding a topic replaces its Think deeper questions,
-- and their answers go with them.
create table critical_answers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  critical_question_id uuid not null references critical_questions (id) on delete cascade,
  answer text not null check (char_length(answer) between 1 and 5000),
  -- strengths[], gaps[], fuller_answer, counterargument
  feedback jsonb not null
);

create index critical_answers_question_id_idx on critical_answers (critical_question_id);

-- Questions saved to learn later: from Think deeper, or typed in. "Learn
-- this" starts a topic from one. A saved question outlives the topic or the
-- Think deeper question it came from, so those links only go null.
create table saved_questions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  text text not null check (char_length(text) between 1 and 500),
  topic_id uuid references topics (id) on delete set null,
  -- Unique, so one Think deeper question is saved at most once.
  critical_question_id uuid unique references critical_questions (id) on delete set null,
  -- The topic started from it.
  started_topic_id uuid references topics (id) on delete set null,
  started_at timestamptz
);

create index saved_questions_created_at_idx on saved_questions (created_at);

alter table critical_answers enable row level security;
alter table saved_questions enable row level security;
