-- Money cell colours become six strong ones: red, yellow, green, purple,
-- blue, pink. Any colour already used moves to its nearest new one, and a
-- colour still called by its old default name gets the new one.
alter table money_one_offs drop constraint money_one_offs_color_check;
alter table money_color_labels drop constraint money_color_labels_color_check;

create function pg_temp.bright(old text) returns text language sql immutable as $$
  select case old
    when 'sky' then 'blue'
    when 'teal' then 'green'
    when 'peach' then 'yellow'
    when 'rose' then 'pink'
    when 'blush' then 'red'
    else old
  end
$$;

update money_entries
set colors = (select coalesce(jsonb_object_agg(key, pg_temp.bright(value #>> '{}')), '{}'::jsonb) from jsonb_each(colors))
where colors <> '{}'::jsonb;

update money_one_offs set color = pg_temp.bright(color) where color is not null;

update money_color_labels
set label = case label
    when 'Sky' then 'Blue'
    when 'Teal' then 'Green'
    when 'Peach' then 'Yellow'
    when 'Rose' then 'Pink'
    when 'Blush' then 'Red'
    else label
  end,
  color = pg_temp.bright(color);

alter table money_one_offs
  add constraint money_one_offs_color_check check (color in ('red', 'yellow', 'green', 'purple', 'blue', 'pink'));
alter table money_color_labels
  add constraint money_color_labels_color_check check (color in ('red', 'yellow', 'green', 'purple', 'blue', 'pink'));
