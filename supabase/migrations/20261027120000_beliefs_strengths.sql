-- Growth workspace: limiting beliefs and strengths.
--
-- A belief is worked through in a guided reframe: where it comes from, the
-- evidence against it, and a kinder, truer belief to replace it, with how
-- strongly it's held at the start and now (0-10).
create table beliefs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  belief text not null check (char_length(belief) between 1 and 500),
  origin text check (char_length(origin) <= 2000),
  evidence_against text check (char_length(evidence_against) <= 4000),
  reframe text check (char_length(reframe) <= 500),
  status text not null default 'working_on' check (status in ('working_on', 'let_go')),
  strength_start smallint check (strength_start between 0 and 10),
  strength_now smallint check (strength_now between 0 and 10),
  let_go_at timestamptz
);

-- Strong sides, with achievements that show them.
create table strengths (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 2000)
);

create unique index strengths_title_idx on strengths (lower(title));

create table strength_achievements (
  strength_id uuid not null references strengths (id) on delete cascade,
  achievement_id uuid not null references achievements (id) on delete cascade,
  primary key (strength_id, achievement_id)
);

create index strength_achievements_achievement_idx on strength_achievements (achievement_id);

alter table beliefs enable row level security;
alter table strengths enable row level security;
alter table strength_achievements enable row level security;

-- Goals moved to target_year; nothing reads target_date any more.
alter table goals drop column target_date;
