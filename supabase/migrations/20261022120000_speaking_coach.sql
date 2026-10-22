-- Speaking coach: practice for spoken English (articulation, active
-- vocabulary, spontaneous thinking, confidence). One profile row, and every
-- exercise with the answer, the feedback and the follow-up. No scores:
-- progress is what's done, and which expressions come back into use.
create table speaking_profile (
  id smallint primary key default 1 check (id = 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  goals text not null check (char_length(goals) between 1 and 1000),
  challenges text not null check (char_length(challenges) between 1 and 1000),
  level text not null check (level in ('getting_by', 'comfortable', 'fluent')),
  -- Where English is needed: meetings, small talk, interviews, ...
  contexts text[] not null default '{}',
  -- Speaking topics the scenes come from, in order; the first is the focus.
  topics text[] not null default '{}'
);

create table speaking_exercises (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- Day of the flexible 14-day plan whose technique it practises (free
  -- practice after day 14 reuses earlier days).
  plan_day smallint not null check (plan_day between 1 and 14),
  skill text not null check (skill in ('vocabulary', 'organising', 'spontaneous', 'conversation')),
  topic text not null,
  scenario text not null,
  question text not null,
  tip text,
  -- Saved expressions this exercise invites back.
  revisit text[] not null default '{}',
  answer text,
  -- Spoken through the microphone (the text is a transcript) or typed.
  spoken boolean,
  feedback jsonb,
  follow_up_answer text,
  follow_up_feedback jsonb,
  completed_at timestamptz
);

create index speaking_exercises_created_at_idx on speaking_exercises (created_at);

alter table speaking_profile enable row level security;
alter table speaking_exercises enable row level security;
