import { topicLevelLabels, type TopicLevel } from "@/lib/schemas/topic";

// How a topic's level shapes it: lesson length and depth, how many recall
// questions and of what kind, how strictly answers are graded, and the size
// of Think deeper and the glossary. The numbers live here; the prompts read
// them as "level rules", so the cached system prompts stay the same for every
// level. A topic without a level counts as "Know the basics".

export type LevelProfile = {
  /** Lesson chunks. */
  parts: string;
  /** Web searches for the research call, at most. */
  searches: number;
  /** What the lesson includes. */
  content: string;
  questions: string;
  questionFocus: string;
  thinkDeeper: number;
  glossaryMax: number;
  glossaryFocus: string;
  /** Extra grading rule; null grades by the rubric alone. */
  grading: string | null;
};

export const LEVEL_PROFILES: Record<TopicLevel, LevelProfile> = {
  beginner: {
    parts: "3",
    searches: 3,
    content: "only the core ideas, in everyday words, with no exceptions or edge cases",
    questions: "3 or 4 in total: one per chunk, plus one on the topic as a whole if it helps",
    questionFocus: 'mostly "why" and "how" about the core ideas, answerable in plain everyday words',
    thinkDeeper: 3,
    glossaryMax: 15,
    glossaryFocus: "every term a newcomer might not know or might misread",
    grading:
      "This learner is new to the topic: give 5 when the core idea is right in plain everyday words. Don't require technical terms.",
  },
  intermediate: {
    parts: "4",
    searches: 5,
    content: "the core ideas plus their main caveats",
    questions: "5 or 6 in total, 1 or 2 per chunk",
    questionFocus: "a mix of why, how, compare and apply",
    thinkDeeper: 5,
    glossaryMax: 10,
    glossaryFocus: "terms someone who knows the basics of the field might not know",
    grading: null,
  },
  advanced: {
    parts: "4 or 5",
    searches: 8,
    content: "beyond the basics: trade-offs, exceptions, edge cases and links to related ideas",
    questions: "6 to 8 in total, 1 or 2 per chunk",
    questionFocus:
      "mostly apply and compare: using the idea in a new situation, weighing it against alternatives, and what breaks it",
    thinkDeeper: 6,
    glossaryMax: 8,
    glossaryFocus: "only real jargon; skip terms anyone working in the field already uses",
    grading:
      "This learner knows the topic well: expect the mechanism or reason and the precise terms. A vague answer that only gestures at the idea scores 3 at most.",
  },
};

export const levelProfile = (level: TopicLevel | null): LevelProfile => LEVEL_PROFILES[level ?? "intermediate"];

/** "Learner's level: Know it well", the first line of every level rules block. */
export const levelLine = (level: TopicLevel | null) =>
  `Learner's level: ${level ? topicLevelLabels[level] : "not given (treat it as Know the basics)"}`;
