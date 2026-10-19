-- Ideas label themselves: when a question or idea is saved, Claude picks the
-- favourite area it belongs to (or names a new one) and writes a short topic
-- title for starting it. Both stay null if labelling fails.
alter table saved_questions
  add column area text check (char_length(area) between 1 and 60),
  add column title text check (char_length(title) between 1 and 200);
