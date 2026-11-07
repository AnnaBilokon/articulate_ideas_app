-- Growth: notes to yourself, shown at the top of Goals every time it opens
-- (why you started, a line that keeps you going).
create table motivation_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  body text not null check (char_length(body) between 1 and 500)
);

alter table motivation_notes enable row level security;
