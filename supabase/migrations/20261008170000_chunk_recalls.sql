-- Recall after each lesson part: before the next part opens, the learner
-- writes the part's main idea from memory and gets short feedback. Rebuilding
-- a lesson replaces its parts, and their recalls go with them.
create table chunk_recalls (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  chunk_id uuid not null references lesson_chunks (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 3000),
  feedback jsonb not null
);

create index chunk_recalls_chunk_id_idx on chunk_recalls (chunk_id);

alter table chunk_recalls enable row level security;
