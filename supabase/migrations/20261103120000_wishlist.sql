-- Money: a wishlist of things to buy later, in lists of your own ("Clothes",
-- "Home"...), each item with an optional photo or screenshot, price, link
-- and note. Bought items are ticked off and kept.
create table wish_lists (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 40),
  position integer not null default 0
);

create unique index wish_lists_name_idx on wish_lists (lower(name));

create table wish_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- Deleting a list keeps its items, without a list.
  list_id uuid references wish_lists (id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  price numeric(12, 2) check (price >= 0),
  url text check (char_length(url) <= 2000 and url ~ '^https?://'),
  note text check (char_length(note) <= 500),
  -- The photo's path in the private "wishlist" storage bucket.
  image_path text check (char_length(image_path) <= 300),
  bought_at timestamptz
);

create index wish_items_list_idx on wish_items (list_id);

alter table wish_lists enable row level security;
alter table wish_items enable row level security;

-- Photos and screenshots, private: the app shows them through short-lived signed links.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wishlist', 'wishlist', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
