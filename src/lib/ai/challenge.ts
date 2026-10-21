import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { FALLBACK_BETA, claude, contentModel, costUsd } from "@/lib/claude";
import { levelLine } from "@/lib/levels";
import {
  spotMistakeContentSchema,
  twoTruthsContentSchema,
  type ChallengeKind,
  type TopicLevel,
} from "@/lib/schemas";

// make_challenge: a practice challenge made from a topic's lesson. Spot the
// mistake and two truths and a lie both train judging claims, not just
// remembering them.

const spotOutput = z.object({
  sentences: z.array(z.string()),
  mistakes: z.array(z.object({ index: z.number(), correction: z.string(), why: z.string() })),
});

const twoTruthsOutput = z.object({
  rounds: z.array(z.object({ statements: z.array(z.object({ text: z.string(), true: z.boolean(), why: z.string() })) })),
});

const COMMON = `Use only what the lesson supports: every true statement must be true by the lesson, and every false one must be clearly contradicted by it. Plain language at the learner's level. Write for this learner, who studied the lesson and may half-remember it.`;

const PROMPTS: Record<ChallengeKind, string> = {
  spot_mistake: `You write a "Spot the mistake" challenge from a lesson the learner studied.

Write a short passage, 6-9 sentences and 120-180 words, that retells key ideas of the lesson in fresh wording, and slip in exactly 2 mistakes.
- Each mistake is one sentence that sounds right to someone who skimmed, but contradicts the lesson: a reversed cause and effect, a confused related concept, an overclaim ("always", "proves", "only"), a wrong condition, or a wrong comparison. Not a changed number or name, not a typo, not a trick of wording.
- The two mistakes are in different sentences, not next to each other, and not the first sentence.
- Every other sentence is correct.
- sentences: the passage as a list of sentences, in order.
- mistakes: for each mistake, index (its position in sentences, counting from 0), correction (the sentence made right), and why (one sentence on what the lesson actually says).

${COMMON}`,
  two_truths: `You write "Two truths and a lie" from a lesson the learner studied: 3 rounds, each about a different main idea.

Each round has 3 short statements, one sentence each, about the same idea. Two are true; one is false but plausible, the kind of thing a learner who half-remembers would believe (a reversed cause, a confused concept, an overclaim, a wrong condition). Put the lie in a different position in each round.
- statements: text, true (true or false), and why: one sentence on why it's true, or what is actually true.

${COMMON}`,
};

export type ChallengeInput = { kind: ChallengeKind; title: string; level: TopicLevel | null; chunks: { title: string; content: string }[] };

export async function makeChallenge(
  input: ChallengeInput,
): Promise<{ content: unknown; usage: { inputTokens: number; outputTokens: number; costUsd: number } }> {
  const usage = { inputTokens: 0, outputTokens: 0, costUsd: 0 };
  const model = contentModel(input.level);
  const output = input.kind === "spot_mistake" ? spotOutput : twoTruthsOutput;
  const strict = input.kind === "spot_mistake" ? spotMistakeContentSchema : twoTruthsContentSchema;
  const prompt = [
    `Topic: ${input.title}`,
    levelLine(input.level),
    `Lesson:\n\n${input.chunks.map((c) => `## ${c.title}\n\n${c.content}`).join("\n\n")}`,
  ].join("\n\n");

  for (let attempt = 0; attempt < 2; attempt++) {
    const stream = claude().beta.messages.stream({
      model,
      max_tokens: 8000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: "medium", format: zodOutputFormat(output) },
      system: [{ type: "text", text: PROMPTS[input.kind], cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: prompt }],
    });
    const message = await stream.finalMessage();
    usage.inputTokens +=
      message.usage.input_tokens +
      (message.usage.cache_creation_input_tokens ?? 0) +
      (message.usage.cache_read_input_tokens ?? 0);
    usage.outputTokens += message.usage.output_tokens;
    if (message.stop_reason === "refusal") throw new Error("Claude declined to make this challenge.");

    const text = message.content.findLast((b) => b.type === "text");
    let raw: unknown;
    try {
      raw = JSON.parse(text?.type === "text" ? text.text : "");
    } catch {
      console.warn(`challenge ${input.kind} returned invalid JSON; retrying`);
      continue;
    }
    const parsed = strict.safeParse(raw);
    if (parsed.success) {
      usage.costUsd = costUsd(model, usage.inputTokens, usage.outputTokens);
      return { content: parsed.data, usage };
    }
    console.warn(`challenge ${input.kind} didn't validate; retrying:`, parsed.error.issues.slice(0, 3));
  }
  throw new Error("The challenge didn't come out right. Try again.");
}
