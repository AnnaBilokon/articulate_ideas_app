-- Money workspace: monthly totals per pay period, like the budget sheet.
--
-- Categories are income, expenses (bills and spending), pots (money set
-- aside each month for clothes, vacation and so on, spent from and carried
-- over) and savings (transfers into accounts with a running balance).
create table money_categories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 60),
  kind text not null check (kind in ('income', 'expense', 'pot', 'saving')),
  position integer not null default 0,
  -- Hidden from new months; past months keep their entries.
  archived_at timestamptz
);

create unique index money_categories_name_idx on money_categories (kind, lower(name));

-- A pay period, from one payday to the next, named by its first month:
-- 2026-06-01 is "Jun–Jul 2026".
create table money_periods (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  month date not null unique check (extract(day from month) = 1),
  note text check (char_length(note) <= 2000)
);

-- One category in one period. amount is what came in, was spent, or was
-- transferred (null until entered); planned is the expected amount. Pots
-- also have what was spent from them, and pots and savings a balance at the
-- end of the period (null: worked out from the period before).
create table money_entries (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references money_periods (id) on delete cascade,
  category_id uuid not null references money_categories (id) on delete cascade,
  amount numeric(12, 2),
  planned numeric(12, 2),
  spent numeric(12, 2),
  balance numeric(12, 2),
  note text check (char_length(note) <= 500),
  unique (period_id, category_id)
);

create index money_entries_category_idx on money_entries (category_id);

-- Spending that happens once: a bike, a birthday.
create table money_one_offs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  period_id uuid not null references money_periods (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  amount numeric(12, 2) not null
);

create index money_one_offs_period_idx on money_one_offs (period_id);

alter table money_categories enable row level security;
alter table money_periods enable row level security;
alter table money_entries enable row level security;
alter table money_one_offs enable row level security;
