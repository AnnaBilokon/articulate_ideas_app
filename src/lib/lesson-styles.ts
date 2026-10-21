import { lessonStyleLabels, lessonStyles, type LessonStyle } from "@/lib/schemas/topic";

// How a lesson is told. Every style keeps the chunk rules (one idea per
// chunk, stated plainly with its "because" and an example), so the recall
// after each part and the grading work the same way; only the telling
// changes. The rules go in the per-topic part of the prompt.

const RULES: Record<LessonStyle, string> = {
  standard: "Explain each idea directly, in the order a newcomer needs them.",
  story: `Teach through one running story that fits the topic: a person or a small team facing a real situation the topic explains. Introduce them in the first chunk, right after saying what the topic is. Each chunk moves the story on and draws out one idea, then states that idea plainly in its last sentences, with its "because". The story frames the facts; it never changes them.`,
  problem_first: `Open with a problem. The first chunk sets up one concrete puzzle, decision or surprising observation the topic explains, says what the topic is, and ends with: "Before you read on: what would you do, and why?" Don't answer it there. Each later chunk solves part of it, one idea at a time, and the last chunk returns to the problem and gives the full answer.`,
  debate: `Teach through a friendly debate between two people, Ada and Ben, who disagree about the topic's central claims (where the topic has no real controversy, one holds a common misconception and the other the evidence). Each chunk is a short exchange about one idea, written as lines starting "Ada:" and "Ben:", and ends with a line starting "What holds up:" that states the idea plainly with its "because". Both make their best case; the evidence decides, not who speaks last.`,
};

/** The level-rules-style block for a lesson prompt. */
export const styleRules = (style: LessonStyle) => `Lesson style: ${lessonStyleLabels[style]}\n- ${RULES[style]}`;

/** What the form says about each style. */
export const lessonStyleHints: Record<LessonStyle | "surprise", string> = {
  surprise: "A different way each time",
  standard: "Clear explanations, part by part",
  story: "Follow someone facing a real problem",
  problem_first: "Try a puzzle first, then see how it works",
  debate: "Two people argue; you judge what holds up",
};

/** "Surprise me": one of the styles that aren't the plain explanation. */
export function surpriseStyle(): LessonStyle {
  const options = lessonStyles.filter((s) => s !== "standard");
  return options[Math.floor(Math.random() * options.length)];
}

/** The question after each lesson part, worded for the style. */
export const recallPromptFor: Record<LessonStyle, { ask: string; placeholder: string }> = {
  standard: { ask: "Without looking back, write its main idea in a sentence or a few. Rough is fine.", placeholder: "The main idea is…" },
  story: { ask: "Without looking back: what did this part of the story show? The idea, in a sentence or a few.", placeholder: "It showed that…" },
  problem_first: { ask: "Without looking back, write its main idea in a sentence or a few. Rough is fine.", placeholder: "The main idea is…" },
  debate: { ask: "Without looking back: what holds up from this exchange, and why? A sentence or a few.", placeholder: "What holds up is…" },
};
