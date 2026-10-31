-- Spending: a spending category can be linked to a Money pot, and a purchase
-- in it can be taken from that pot. The pot then counts it as spent in the
-- pay period it falls in.
alter table spend_categories
  add column pot_category_id uuid references money_categories (id) on delete set null;

alter table spend_purchases add column from_pot boolean not null default false;

-- Link the categories that share a name with a pot.
update spend_categories s
set pot_category_id = m.id
from money_categories m
where m.kind = 'pot' and lower(m.name) = lower(s.name) and s.pot_category_id is null;
