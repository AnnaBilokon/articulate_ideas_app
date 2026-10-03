-- Material the learner pasted in themselves (notes, an article, a transcript).
-- When set, the lesson is built from this text instead of web research.
alter table topics
  add column source_text text check (char_length(source_text) <= 60000);
