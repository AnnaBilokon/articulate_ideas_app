-- Spending: a category linked to a Money pot can take every purchase from it,
-- without asking each time. Cosmetics does: its purchases, the ones already
-- logged too, come off the Cosmetics pot.

alter table spend_categories add column pot_always boolean not null default false;

update spend_categories set pot_always = true
where lower(name) = 'cosmetics' and pot_category_id is not null;

update spend_purchases p set from_pot = true
from spend_categories c
where p.category_id = c.id and c.pot_always and not p.from_pot;
