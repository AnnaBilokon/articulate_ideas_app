-- Goals aim for a year, not a day. Any target date set so far becomes its
-- year. target_date stays until the app no longer reads it, so applying
-- this before the new code deploys breaks nothing; a later migration drops it.
alter table goals add column target_year smallint check (target_year between 2000 and 2100);
update goals set target_year = extract(year from target_date)::smallint where target_date is not null;
