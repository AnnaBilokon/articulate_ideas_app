-- Per-topic glossary: hard terms and abbreviations with plain definitions.
-- Claude builds it after the Topic Card; the learner can add and remove terms.
create table glossary_terms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  topic_id uuid not null references topics (id) on delete cascade,
  term text not null check (char_length(term) between 1 and 80),
  -- The expanded form when the term is an abbreviation, e.g. "FSRS".
  full_form text,
  definition text not null,
  example text,
  source text not null default 'claude' check (source in ('claude', 'user'))
);

-- One entry per term per topic, ignoring case.
create unique index glossary_terms_topic_term_idx on glossary_terms (topic_id, lower(term));

alter table glossary_terms enable row level security;
