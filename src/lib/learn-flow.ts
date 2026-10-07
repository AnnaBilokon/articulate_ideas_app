// The learn flow from PLAN.md, in order. The pretest isn't built yet, so a
// topic never stops there.
export const LEARN_STEPS = ["Pretest", "Lesson", "Brain dump", "Topic card", "Quiz", "Teach-back", "Think deeper"] as const;

const LESSON = 1;
const DUMP = 2;
const QUIZ = 4;
const TEACH = 5;
const THINK = 6;

/** Index in LEARN_STEPS of the step a topic is up to. */
export function currentLearnStep(topic: {
  hasLesson: boolean;
  hasDump: boolean;
  quizTaken: boolean;
  explained: boolean;
}): number {
  if (!topic.hasLesson) return LESSON;
  if (!topic.hasDump) return DUMP;
  if (!topic.quizTaken) return QUIZ;
  if (!topic.explained) return TEACH;
  return THINK;
}
