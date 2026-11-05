-- Push notifications: a reminder 5 minutes before each calendar block.
-- Each device that turns reminders on saves its push subscription here.
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  -- Which device it is, to tell them apart ("iPhone", "Windows").
  device text check (char_length(device) <= 60)
);

alter table push_subscriptions enable row level security;

-- When the reminder went out, so each block reminds once. Cleared when the
-- block moves, so it reminds again at the new time.
alter table calendar_events add column reminded_at timestamptz;

-- The sender looks for blocks starting soon that haven't reminded yet.
create index calendar_events_reminder_idx on calendar_events (starts_at) where reminded_at is null and done_at is null;
