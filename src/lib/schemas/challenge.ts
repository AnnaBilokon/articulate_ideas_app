import { z } from "zod";

// Challenges: practice formats made from a topic's lesson. The content holds
// the answer key; players only see the public view until they answer.

export const challengeKinds = ["spot_mistake", "two_truths"] as const;
export type ChallengeKind = (typeof challengeKinds)[number];

export const challengeInfo: Record<ChallengeKind, { name: string; blurb: string }> = {
  spot_mistake: {
    name: "Spot the mistake",
    blurb: "A short passage about the topic with 2 hidden mistakes. Find them, and say what's right.",
  },
  two_truths: {
    name: "Two truths and a lie",
    blurb: "Three rounds of three statements. One in each is false but sounds right: find it.",
  },
};

export const SPOT_MISTAKES = 2;

export const spotMistakeContentSchema = z
  .object({
    sentences: z.array(z.string().trim().min(1)).min(5).max(10),
    mistakes: z
      .array(z.object({ index: z.int().min(0), correction: z.string().trim().min(1), why: z.string().trim().min(1) }))
      .length(SPOT_MISTAKES),
  })
  .refine((c) => c.mistakes.every((m) => m.index < c.sentences.length), "A mistake points past the passage.")
  .refine((c) => new Set(c.mistakes.map((m) => m.index)).size === c.mistakes.length, "Two mistakes share a sentence.");

export const twoTruthsContentSchema = z.object({
  rounds: z
    .array(
      z.object({
        statements: z
          .array(z.object({ text: z.string().trim().min(1), true: z.boolean(), why: z.string().trim().min(1) }))
          .length(3)
          .refine((s) => s.filter((x) => !x.true).length === 1, "Each round needs exactly one lie."),
      }),
    )
    .length(3),
});

export type SpotMistakeContent = z.infer<typeof spotMistakeContentSchema>;
export type TwoTruthsContent = z.infer<typeof twoTruthsContentSchema>;

// What the player answers.
export const spotMistakeAnswerSchema = z.object({ flagged: z.array(z.int().min(0)).max(10) });
export const twoTruthsAnswerSchema = z.object({ picks: z.array(z.int().min(0).max(2)).length(3) });

// What the player sees before answering: no answer key.
export type ChallengeView =
  | { kind: "spot_mistake"; sentences: string[] }
  | { kind: "two_truths"; rounds: string[][] };

export function challengeView(kind: ChallengeKind, content: unknown): ChallengeView | null {
  if (kind === "spot_mistake") {
    const parsed = spotMistakeContentSchema.safeParse(content);
    return parsed.success ? { kind, sentences: parsed.data.sentences } : null;
  }
  const parsed = twoTruthsContentSchema.safeParse(content);
  return parsed.success ? { kind, rounds: parsed.data.rounds.map((r) => r.statements.map((s) => s.text)) } : null;
}

// Scoring, 0-5, without Claude: the answer key says exactly what's right.

export type SpotMistakeResult = {
  found: number[];
  wrongFlags: number[];
  mistakes: { index: number; sentence: string; correction: string; why: string }[];
};

export function scoreSpotMistake(content: SpotMistakeContent, flagged: number[]): { score: number; result: SpotMistakeResult } {
  const keys = new Set(content.mistakes.map((m) => m.index));
  const unique = [...new Set(flagged)];
  const found = unique.filter((i) => keys.has(i));
  const wrongFlags = unique.filter((i) => !keys.has(i));
  // Each mistake found is worth 2.5; each correct sentence flagged costs 1.
  const score =
    found.length === 0 ? (unique.length > 0 ? 1 : 0) : Math.max(1, Math.min(5, Math.round(found.length * 2.5) - wrongFlags.length));
  return {
    score,
    result: {
      found,
      wrongFlags,
      mistakes: content.mistakes.map((m) => ({ ...m, sentence: content.sentences[m.index] })),
    },
  };
}

export type TwoTruthsResult = {
  rounds: { picked: number; lie: number; statements: { text: string; true: boolean; why: string }[] }[];
};

export function scoreTwoTruths(content: TwoTruthsContent, picks: number[]): { score: number; result: TwoTruthsResult } {
  const rounds = content.rounds.map((r, i) => ({
    picked: picks[i],
    lie: r.statements.findIndex((s) => !s.true),
    statements: r.statements,
  }));
  const right = rounds.filter((r) => r.picked === r.lie).length;
  return { score: Math.round((right / rounds.length) * 5), result: { rounds } };
}
