-- Money: colour any amount, like highlighting a cell in a sheet. Five colours
-- from the Money palette, each with a name the user chooses.

-- Per entry: which of its amounts are coloured, e.g. {"amount": "rose"}.
alter table money_entries
  add column colors jsonb not null default '{}' check (jsonb_typeof(colors) = 'object');

alter table money_one_offs
  add column color text check (color in ('sky', 'blush', 'peach', 'rose', 'teal'));

create table money_color_labels (
  color text primary key check (color in ('sky', 'blush', 'peach', 'rose', 'teal')),
  label text not null check (char_length(label) between 1 and 30)
);

alter table money_color_labels enable row level security;
