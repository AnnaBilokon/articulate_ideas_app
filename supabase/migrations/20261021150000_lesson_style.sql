-- How a topic's lesson is told: the plain explanation (standard), a story,
-- a problem to solve first, or a debate between two people. Chosen when the
-- topic is created ("Surprise me" picks one); existing topics stay standard.
alter table topics
  add column lesson_style text not null default 'standard'
    check (lesson_style in ('standard', 'story', 'problem_first', 'debate'));
