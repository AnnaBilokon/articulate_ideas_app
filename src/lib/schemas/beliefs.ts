import { z } from "zod";

// Growth workspace: limiting beliefs, worked through in a guided reframe,
// and strengths. How strongly a belief is held is a 0-10 feeling, never a score.

export const beliefStatuses = ["working_on", "let_go"] as const;
export type BeliefStatus = (typeof beliefStatuses)[number];

const optional = (max: number, message: string) => z.string().trim().max(max, message);
const rating = z.number().int().min(0).max(10).nullable();

export const beliefSchema = z.object({
  belief: z.string().trim().min(1, "Write the belief first.").max(500, "Keep the belief under 500 characters."),
  origin: optional(2000, "Keep this under 2000 characters."),
  evidenceAgainst: optional(4000, "Keep this under 4000 characters."),
  reframe: optional(500, "Keep the new belief under 500 characters."),
  strengthStart: rating,
  strengthNow: rating,
});
export type BeliefInput = z.infer<typeof beliefSchema>;

export const strengthSchema = z.object({
  title: z.string().trim().min(1, "Name the strength.").max(120, "Keep the name under 120 characters."),
  description: optional(2000, "Keep the description under 2000 characters."),
});
export type StrengthInput = z.infer<typeof strengthSchema>;

/** What "Help me reframe" suggests: questions to test the belief, and kinder, truer ways to put it. */
export const reframeHelpSchema = z.object({
  questions: z.array(z.string().trim().min(1)).min(2).max(4),
  reframes: z.array(z.string().trim().min(1).max(300)).min(2).max(3),
  // Set only when the belief suggests the person may be in real distress.
  support_note: z.string().trim().nullable(),
});
export type ReframeHelp = z.infer<typeof reframeHelpSchema>;
