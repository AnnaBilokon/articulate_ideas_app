-- Learning: quick facts for when there's little time or energy. Pick a topic,
-- then a question, and read a short answer. Every fact read is kept here, so
-- it's in the Library; one can also become a review question.
create table quick_facts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- The topic it came from ("Psychology", "Space").
  area text not null check (char_length(area) between 1 and 60),
  question text not null check (char_length(question) between 1 and 300),
  fact text not null check (char_length(fact) between 1 and 1500),
  why_interesting text check (char_length(why_interesting) <= 400),
  -- A review question drafted with the fact ({ text, type, key_points }),
  -- for "Add to my reviews"; null when there's nothing worth reviewing.
  review_draft jsonb
);

create index quick_facts_area_created_idx on quick_facts (area, created_at desc);
create index quick_facts_created_idx on quick_facts (created_at desc);

alter table quick_facts enable row level security;

-- A review question now belongs to a topic or to a quick fact, never both.
alter table recall_questions alter column topic_id drop not null;
alter table recall_questions add column quick_fact_id uuid references quick_facts (id) on delete cascade;
alter table recall_questions
  add constraint recall_questions_owner_check check ((topic_id is null) <> (quick_fact_id is null));
-- One review question per fact.
create unique index recall_questions_quick_fact_idx on recall_questions (quick_fact_id) where quick_fact_id is not null;
