import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { FALLBACK_BETA, STRONG_MODEL, claude } from "@/lib/claude";
import { buildCriticalSchema, criticalKinds, type CriticalQuestion, type TopicCard } from "@/lib/schemas";
import { topicLevelLabels, type TopicLevel } from "@/lib/schemas/topic";

// build_critical: open "Think deeper" questions on top of the Topic Card.

const criticalOutputSchema = z.object({
  questions: z.array(
    z.object({
      text: z.string(),
      kind: z.enum(criticalKinds),
      considerations: z.array(z.string()),
    }),
  ),
});

const SYSTEM_PROMPT = `You are a personal learning coach. The learner has studied a topic and can recall its basics. Now write questions that make them think critically about it and push their understanding deeper.

What makes a good question here:
- It has no single right answer. Reasonable people could answer it differently, and a good answer needs reasoning, not recall.
- It is specific to this topic, not a generic "what do you think?".
- It can be answered in a paragraph by someone who read the lesson, though it may reach beyond it.
- Plain language, one question per item, no multi-part lists.

Write 5 or 6 questions, using at least 4 different kinds:
- assumptions: what the idea takes for granted, and what happens if that's false.
- evidence: how we know it's true, how strong the evidence is, what would change our mind.
- counterargument: the strongest objection or a case where it fails.
- implications: what follows if it's true, for decisions, people, or society.
- perspectives: how it looks from another discipline, culture, role, or stakeholder.
- transfer: using it in a different field or a new, concrete situation.

For each question, give 2 to 4 considerations: short angles or tensions a strong answer would weigh. They guide thinking without giving the answer away. No "it depends" without saying on what.`;

export type CriticalInput = {
  title: string;
  level: TopicLevel | null;
  card: TopicCard;
  chunks: { title: string; content: string }[];
};

function userPrompt({ title, level, card, chunks }: CriticalInput): string {
  return [
    `Topic: ${title}`,
    `Learner's level: ${level ? topicLevelLabels[level] : "not given"}`,
    `Topic Card:\n- In one sentence: ${card.one_sentence}\n- Summary: ${card.paragraph}\n- Analogy: ${card.analogy}\n- Common mistake: ${card.counterpoint}\n- Connects to: ${card.connects_to.join(", ")}`,
    `Lesson:\n\n${chunks.map((c) => `## ${c.title}\n\n${c.content}`).join("\n\n")}`,
  ].join("\n\n");
}

export async function buildCriticalQuestions(
  input: CriticalInput,
): Promise<{ questions: CriticalQuestion[]; usage: { inputTokens: number; outputTokens: number; costUsd: number } }> {
  const usage = { inputTokens: 0, outputTokens: 0, costUsd: 0 };

  for (let attempt = 0; attempt < 2; attempt++) {
    const stream = claude().beta.messages.stream({
      model: STRONG_MODEL,
      max_tokens: 8000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: "medium", format: zodOutputFormat(criticalOutputSchema) },
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userPrompt(input) }],
    });
    const message = await stream.finalMessage();

    usage.inputTokens +=
      message.usage.input_tokens +
      (message.usage.cache_creation_input_tokens ?? 0) +
      (message.usage.cache_read_input_tokens ?? 0);
    usage.outputTokens += message.usage.output_tokens;

    if (message.stop_reason === "refusal") throw new Error("Claude declined to write these questions.");

    const text = message.content.findLast((b) => b.type === "text");
    let raw: unknown;
    try {
      raw = JSON.parse(text?.type === "text" ? text.text : "");
    } catch {
      continue;
    }
    const parsed = buildCriticalSchema.safeParse(raw);
    if (parsed.success) {
      // Opus 5.5: $4 / $20 per million tokens.
      usage.costUsd = (usage.inputTokens * 4 + usage.outputTokens * 20) / 1_000_000;
      return { questions: parsed.data.questions, usage };
    }
  }
  throw new Error("The questions didn't come out in the expected shape. Try again.");
}
