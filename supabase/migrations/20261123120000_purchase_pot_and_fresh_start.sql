-- Money: any purchase can come off any pot, and a pot or saving can start
-- fresh in a month.
--
-- A purchase now names the pot it was taken from, so a category without a
-- pot of its own (Transport) can still take from one (Entertainment). The
-- purchases already taken from their category's pot keep it. from_pot stays,
-- kept in step (pot_id is not null), until the app no longer reads it.
alter table spend_purchases
  add column pot_id uuid references money_categories (id) on delete set null;

update spend_purchases p
set pot_id = c.pot_category_id
from spend_categories c
where p.category_id = c.id and p.from_pot and c.pot_category_id is not null;

create index spend_purchases_pot_idx on spend_purchases (pot_id) where pot_id is not null;

-- What a pot or saving really held at the start of a pay period, when typed:
-- it replaces last month's balance as the starting point, so the month (and
-- every month after it) counts from there. Null: carried over as before.
alter table money_entries add column opening numeric(12, 2);
