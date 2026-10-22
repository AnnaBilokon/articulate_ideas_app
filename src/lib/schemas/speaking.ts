import { z } from "zod";

// Speaking coach: the learner's profile, the flexible 14-day plan, and the
// shapes of exercises and feedback. No scores anywhere: progress is what's
// done and which expressions come back into use.

export const speakingLevels = ["getting_by", "comfortable", "fluent"] as const;
export type SpeakingLevel = (typeof speakingLevels)[number];

export const speakingLevelInfo: Record<SpeakingLevel, { label: string; hint: string }> = {
  getting_by: { label: "I get by", hint: "I can say what I need, but I often search for words" },
  comfortable: { label: "I'm comfortable", hint: "I speak easily, but want to sound clearer and more natural" },
  fluent: { label: "I'm fluent", hint: "I want polish: precise words, smooth structure, confidence" },
};

export const speakingContextOptions = [
  "Meetings and stand-ups",
  "Explaining technical work",
  "Talking to non-technical people",
  "Code reviews and feedback",
  "Job interviews",
  "Presentations",
  "Small talk",
  "Social conversations",
] as const;

export const DEFAULT_SPEAKING_TOPIC = "AI developer work";

/** Expressions saved from the coach go to Vocabulary with a context starting with this. */
export const SPEAKING_SAVED_PREFIX = "Speaking coach: ";
export const MAX_SPEAKING_TOPICS = 8;

export const speakingProfileSchema = z.object({
  goals: z.string().trim().min(1, "Say what you want to get better at.").max(1000),
  challenges: z.string().trim().min(1, "Say what makes speaking hard, even in a few words.").max(1000),
  level: z.enum(speakingLevels),
  contexts: z.array(z.string().trim().min(1).max(60)).max(12),
  topics: z
    .array(z.string().trim().min(1).max(60))
    .min(1, "Add at least one topic to practise.")
    .max(MAX_SPEAKING_TOPICS, `Up to ${MAX_SPEAKING_TOPICS} topics.`),
});

export type SpeakingProfile = z.infer<typeof speakingProfileSchema>;

export const speakingSkills = ["vocabulary", "organising", "spontaneous", "conversation"] as const;
export type SpeakingSkill = (typeof speakingSkills)[number];

export const speakingSkillInfo: Record<SpeakingSkill, { label: string; blurb: string }> = {
  vocabulary: { label: "Finding words", blurb: "Retrieve the word you need, or get around it" },
  organising: { label: "Organising thoughts", blurb: "Give answers a clear shape" },
  spontaneous: { label: "Spontaneous answers", blurb: "Speak well without preparing" },
  conversation: { label: "Conversation", blurb: "Keep a real exchange going" },
};

/** The flexible 14-day plan: a day moves on after its exercises, not by the calendar. */
export const SPEAKING_PLAN: { day: number; skill: SpeakingSkill; title: string; technique: string }[] = [
  { day: 1, skill: "vocabulary", title: "Name it", technique: "Find the precise word for things in your field, and use it in a sentence." },
  { day: 2, skill: "vocabulary", title: "Describe it", technique: "When the word won't come, describe it: what it is, what it does, what it's like." },
  { day: 3, skill: "vocabulary", title: "Say it another way", technique: "Rephrase: say the same thing in simpler or different words." },
  { day: 4, skill: "organising", title: "Point, reason, example", technique: "Lead with your point, give one reason, add one example, then restate the point." },
  { day: 5, skill: "organising", title: "Tell a short story", technique: "Situation, what you did, what happened, what you learned: in that order." },
  { day: 6, skill: "organising", title: "Explain it simply", technique: "Explain a technical idea to someone outside your field, with one everyday comparison." },
  { day: 7, skill: "spontaneous", title: "Unexpected questions", technique: "Answer the question asked, briefly, then add one detail." },
  { day: 8, skill: "spontaneous", title: "Buy time naturally", technique: "Use a short phrase to think out loud instead of going silent or saying 'um'." },
  { day: 9, skill: "spontaneous", title: "Opinions on the spot", technique: "Give a clear view, one reason, and a fair 'on the other hand'." },
  { day: 10, skill: "conversation", title: "Small talk that flows", technique: "Answer, add something about yourself, then ask something back." },
  { day: 11, skill: "conversation", title: "Good follow-up questions", technique: "Pick up a detail from what they said and ask about it." },
  { day: 12, skill: "conversation", title: "Disagree politely", technique: "Acknowledge their point, then give yours with a reason, without 'but you're wrong'." },
  { day: 13, skill: "conversation", title: "Real situations", technique: "Mix it all: a clear point, natural phrases, a question back." },
  { day: 14, skill: "spontaneous", title: "Your expressions, in use", technique: "Reuse expressions you've saved, in a new situation." },
];

export const EXERCISES_PER_DAY = 3;

/** The day to practise: the first with fewer than 3 exercises done. After day 14, free practice on day 14. */
export function currentPlanDay(doneByDay: Map<number, number>): { day: number; freePractice: boolean } {
  const open = SPEAKING_PLAN.find((d) => (doneByDay.get(d.day) ?? 0) < EXERCISES_PER_DAY);
  return open ? { day: open.day, freePractice: false } : { day: 14, freePractice: true };
}

// Answers, spoken (a transcript) or typed.
export const MAX_SPEAKING_ANSWER_CHARS = 3000;
export const speakingAnswerSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Say or type an answer first.")
    .max(MAX_SPEAKING_ANSWER_CHARS, "That's long for one answer. A minute or two of speaking is plenty."),
  spoken: z.boolean(),
});

export const speakingExpressionSchema = z.object({
  expression: z.string().trim().min(1).max(60),
  meaning: z.string().trim().min(1),
  example: z.string().trim().min(1),
});
export type SpeakingExpression = z.infer<typeof speakingExpressionSchema>;

export const speakingFeedbackSchema = z.object({
  well: z.string().trim().min(1),
  clarity: z.string().trim().min(1),
  structure: z.string().trim().min(1),
  vocabulary: z.string().trim().min(1),
  grammar: z.string().trim().min(1),
  improved: z.string().trim().min(1),
  expressions: z.array(speakingExpressionSchema).min(2).max(3),
  follow_up: z.string().trim().min(1),
  // Saved expressions the exercise invited back that the answer used.
  used_revisit: z.array(z.string()),
});
export type SpeakingFeedback = z.infer<typeof speakingFeedbackSchema>;

export const speakingFollowUpFeedbackSchema = z.object({
  used: z.array(z.string()),
  note: z.string().trim().min(1),
  improved: z.string().trim().nullable(),
});
export type SpeakingFollowUpFeedback = z.infer<typeof speakingFollowUpFeedbackSchema>;
