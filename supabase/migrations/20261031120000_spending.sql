-- Money: a spending tracker, separate from the monthly budget, pots and
-- savings. Categories with an icon and a colour, and every purchase, which
-- counts in the pay period it falls in (from the payday set below).
create table spend_categories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 40),
  icon text not null check (char_length(icon) between 1 and 40),
  color text not null check (color in ('red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink')),
  position integer not null default 0,
  -- Hidden from adding new purchases; its purchases stay.
  archived_at timestamptz
);

create unique index spend_categories_name_idx on spend_categories (lower(name));

create table spend_purchases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- A category with purchases can't be deleted, only hidden.
  category_id uuid not null references spend_categories (id) on delete restrict,
  spent_on date not null,
  -- Negative for a refund.
  amount numeric(12, 2) not null check (amount <> 0),
  note text check (char_length(note) <= 200)
);

create index spend_purchases_spent_on_idx on spend_purchases (spent_on);
create index spend_purchases_category_idx on spend_purchases (category_id);

-- Money settings, one row: the day pay arrives, which starts each pay period.
create table money_settings (
  id smallint primary key default 1 check (id = 1),
  payday smallint not null default 25 check (payday between 1 and 28)
);

insert into money_settings (id) values (1);

alter table spend_categories enable row level security;
alter table spend_purchases enable row level security;
alter table money_settings enable row level security;
