import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { FALLBACK_BETA, STRONG_MODEL, claude } from "@/lib/claude";
import {
  MAX_QUIZ_QUESTIONS,
  buildCardSchema,
  normalizeTag,
  recallQuestionTypes,
  type BuildCardResult,
} from "@/lib/schemas";
import { topicLevelLabels, type TopicLevel } from "@/lib/schemas/topic";

// build_card: Topic Card, recall questions with key points, and tags.

// What Claude must produce; counts and tag format are checked afterwards
// with buildCardSchema.
const cardOutputSchema = z.object({
  card: z.object({
    one_sentence: z.string(),
    paragraph: z.string(),
    analogy: z.string(),
    counterpoint: z.string(),
    connects_to: z.array(z.string()),
  }),
  recall_questions: z.array(
    z.object({
      text: z.string(),
      key_points: z.array(z.string()),
      type: z.enum(recallQuestionTypes),
    }),
  ),
  tags: z.array(z.string()),
});

const SYSTEM_PROMPT = `You are a personal learning coach. From a lesson the learner has just read, you make a Topic Card they will return to, and recall questions they will be quizzed on for months with spaced repetition.

How to write:
- Plain language, short sentences, concrete examples.
- Say when something is uncertain or debated.
- Warm and direct. No flattery, no filler.
- Use only what the lesson supports. Don't add new facts.

Output (JSON matching the schema):
- card.one_sentence: the whole idea in one sentence a friend would understand.
- card.paragraph: 3-5 sentences: what it is, why it works or matters, and one example.
- card.analogy: one vivid everyday analogy, 1-2 sentences.
- card.counterpoint: the most common mistake or misconception, or the strongest counterpoint, and why it's wrong or where it holds. 1-3 sentences.
- card.connects_to: 2-4 related ideas or fields, each a short phrase.
- recall_questions: 1 or 2 per lesson chunk, about 5 to 8 in total, that test understanding, not wording. Cover each chunk's main idea; skip minor details. No questions on a "Worth double-checking" chunk.
  - Mix the types: "why" (explain a cause), "how" (explain a mechanism or process), "compare" (contrast with a related idea), "apply" (use it in a new, concrete situation).
  - Each question asks for one clear thing and is answerable in 1-3 sentences from the lesson. If it needs two things, say so in the question ("name two", "color and taste").
  - key_points: 2 to 4 short points. First the core answer to the question, then supporting details or examples (these are extras the grader won't require). Each point is one specific idea, stated plainly. No vague points like "explains it well".
  - Don't ask yes/no questions or ask for definitions word for word.
- tags: 3 to 5 broad, reusable tags, lowercase words joined by hyphens (e.g. "decision-making"). Reuse the learner's existing tags whenever one fits instead of making a near-duplicate.`;

export type CardInput = {
  title: string;
  level: TopicLevel | null;
  chunks: { title: string; content: string }[];
  questions: { text: string; answer: string | null }[];
  existingTags: string[];
};

export type CardResult = {
  result: BuildCardResult;
  usage: { inputTokens: number; outputTokens: number; costUsd: number };
};

function userPrompt({ title, level, chunks, questions, existingTags }: CardInput): string {
  return [
    `Topic: ${title}`,
    `Learner's level: ${level ? topicLevelLabels[level] : "not given"}`,
    `Learner's existing tags: ${existingTags.length > 0 ? existingTags.join(", ") : "none yet"}`,
    `Lesson:\n\n${chunks.map((c) => `## ${c.title}\n\n${c.content}`).join("\n\n")}`,
    questions.length > 0
      ? `Questions and answers from the lesson:\n\n${questions
          .map((q) => `Q: ${q.text}\nA: ${q.answer ?? "(not answered)"}`)
          .join("\n\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Builds the card; retries once if the output fails validation. */
export async function buildTopicCard(input: CardInput): Promise<CardResult> {
  const usage = { inputTokens: 0, outputTokens: 0, costUsd: 0 };

  for (let attempt = 0; attempt < 2; attempt++) {
    const stream = claude().beta.messages.stream({
      model: STRONG_MODEL,
      max_tokens: 16000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: "medium", format: zodOutputFormat(cardOutputSchema) },
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userPrompt(input) }],
    });
    const message = await stream.finalMessage();

    usage.inputTokens +=
      message.usage.input_tokens +
      (message.usage.cache_creation_input_tokens ?? 0) +
      (message.usage.cache_read_input_tokens ?? 0);
    usage.outputTokens += message.usage.output_tokens;

    if (message.stop_reason === "refusal") throw new Error("Claude declined to build this card.");

    const text = message.content.findLast((b) => b.type === "text");
    let raw: unknown;
    try {
      raw = JSON.parse(text?.type === "text" ? text.text : "");
    } catch {
      continue;
    }
    const shaped = cardOutputSchema.safeParse(raw);
    if (!shaped.success) continue;

    const tags = [...new Set(shaped.data.tags.map(normalizeTag).filter(Boolean))].slice(0, 5);
    const parsed = buildCardSchema.safeParse({
      ...shaped.data,
      recall_questions: shaped.data.recall_questions.slice(0, MAX_QUIZ_QUESTIONS),
      tags,
    });
    if (parsed.success) {
      // Opus 5.5: $4 / $20 per million tokens.
      usage.costUsd = (usage.inputTokens * 4 + usage.outputTokens * 20) / 1_000_000;
      return { result: parsed.data, usage };
    }
  }
  throw new Error("The card didn't come out in the expected shape. Try again.");
}
