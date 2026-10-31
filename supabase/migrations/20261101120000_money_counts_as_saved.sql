-- Money: which savings count as really saved, and savings goals.
--
-- Investments and money kept for someone else still leave the account (free
-- cash counts them) but aren't part of "Saved" or the savings rate.
alter table money_categories add column counts_as_saved boolean not null default true;

update money_categories
set counts_as_saved = false
where kind = 'saving' and name in ('SEB invest', 'Invest', 'Tomas');

-- A savings goal: the balance to reach.
alter table money_categories add column target numeric(12, 2) check (target > 0);

update money_categories set target = 60000 where kind = 'saving' and name = 'Emergency fund';
update money_categories set target = 100000 where kind = 'saving' and name = 'Save';
