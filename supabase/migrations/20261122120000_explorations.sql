-- Learning: Explore, a chat that starts from your own question. A short intro,
-- then talk it through with Claude; saving writes a note of what you covered,
-- and the review questions you pick from it join the reviews.
create table explorations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The question it started from ("What is a RAG system?").
  question text not null check (char_length(question) between 1 and 500),
  -- A short title Claude gives it ("RAG systems").
  title text not null check (char_length(title) between 1 and 120),
  -- The area it belongs to ("AI engineering"), like a quick fact's.
  area text not null check (char_length(area) between 1 and 60),
  -- The chat: [{ role: "claude", text, suggestions[], check }, { role: "you", kind, text }].
  messages jsonb not null default '[]',
  -- "Save to my knowledge": { summary, key_ideas[], examples[] }; null until saved.
  note jsonb,
  -- Review questions drafted with the note ([{ text, type, key_points }]), to pick from.
  review_drafts jsonb,
  saved_at timestamptz
);

create index explorations_created_idx on explorations (created_at desc);

alter table explorations enable row level security;

-- A review question now belongs to a topic, a quick fact or an exploration.
alter table recall_questions add column exploration_id uuid references explorations (id) on delete cascade;
alter table recall_questions drop constraint recall_questions_owner_check;
alter table recall_questions
  add constraint recall_questions_owner_check check (num_nonnulls(topic_id, quick_fact_id, exploration_id) = 1);
create index recall_questions_exploration_idx on recall_questions (exploration_id) where exploration_id is not null;
