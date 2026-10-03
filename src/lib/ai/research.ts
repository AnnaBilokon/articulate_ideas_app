import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { FALLBACK_BETA, STRONG_MODEL, claude } from "@/lib/claude";
import { MAX_CHUNK_WORDS, lessonSchema, type Lesson } from "@/lib/schemas";
import { topicLevelLabels, type TopicLevel } from "@/lib/schemas/topic";

// research_and_lesson: web search, then a chunked lesson as JSON.

const MAX_SEARCHES = 5;

// The shape Claude must produce. Kept to plain types the structured-output
// format accepts; word limits, URL format and counts are checked afterwards
// with the stricter lessonSchema.
const lessonOutputSchema = z.object({
  answers: z.array(z.object({ question: z.string(), answer: z.string() })),
  suggested_questions: z.array(z.object({ question: z.string(), answer: z.string() })),
  chunks: z.array(z.object({ title: z.string(), content: z.string() })),
  sources: z.array(z.object({ url: z.string(), title: z.string() })),
});

const SYSTEM_PROMPT = `You are a personal learning coach. You research a topic on the web, then write a short lesson that will be read in chunks, recalled from memory, and reviewed for months.

How to write:
- Plain language, short sentences, concrete examples.
- Say when something is uncertain, debated, or depends on context.
- Warm and direct. No flattery, no filler, no "great question".
- Teach for understanding: explain why things are true, not only what is true.

Research:
- Use web search to check facts, find current understanding, and find good sources. Prefer primary, academic, and well-known reference sources.
- Only list sources you actually found in your search results, with their exact URLs.

Output (JSON matching the schema):
- answers: one entry per learner question, in the same order, each 2-4 sentences. Empty if there are no questions.
- suggested_questions: up to 3 questions the learner did not ask but should, each with a 2-4 sentence answer.
- chunks: the lesson itself, 3 to 7 chunks in a sensible learning order. Each chunk has a short title and ${MAX_CHUNK_WORDS - 150}-${MAX_CHUNK_WORDS - 50} words of content (never more than ${MAX_CHUNK_WORDS}). Cover the learner's questions and the suggested questions within the chunks. Plain paragraphs; you may use short bullet lists with "- ". No headings inside a chunk.
- sources: 2-8 sources you relied on, each with url and title.`;

export type ResearchInput = {
  title: string;
  level: TopicLevel | null;
  questions: string[];
};

export type ResearchEvent =
  | { type: "search"; query: string }
  | { type: "reading" }
  | { type: "writing" }
  | { type: "retry" };

export type ResearchResult = {
  lesson: Lesson;
  usage: { inputTokens: number; outputTokens: number; searches: number; costUsd: number };
};

function userPrompt({ title, level, questions }: ResearchInput): string {
  const lines = [
    `Topic: ${title}`,
    `Learner's level: ${level ? topicLevelLabels[level] : "not given"}`,
    questions.length > 0
      ? `Learner's questions:\n${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
      : "Learner's questions: none",
  ];
  return lines.join("\n\n");
}

// Opus 5.5 prices: $4 / $20 per million tokens; web search $10 per 1,000 searches.
function estimateCost(input: number, output: number, searches: number): number {
  return (input * 4 + output * 20) / 1_000_000 + searches * 0.01;
}

/**
 * Runs the research call, reporting progress through onEvent. Retries once if
 * the output fails validation. Throws on API errors, refusals, or a second
 * invalid output.
 */
export async function researchLesson(
  input: ResearchInput,
  onEvent: (event: ResearchEvent) => void,
): Promise<ResearchResult> {
  const usage = { inputTokens: 0, outputTokens: 0, searches: 0, costUsd: 0 };

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) onEvent({ type: "retry" });
    const { text, foundUrls } = await runConversation(input, onEvent, usage);

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      continue;
    }
    const shaped = lessonOutputSchema.safeParse(raw);
    if (!shaped.success) continue;

    // Keep only sources that really appeared in the search results.
    const sources = shaped.data.sources.filter((s) => foundUrls.has(normalizeUrl(s.url)));
    const parsed = lessonSchema.safeParse({ ...shaped.data, sources });
    if (parsed.success) {
      usage.costUsd = estimateCost(usage.inputTokens, usage.outputTokens, usage.searches);
      return { lesson: parsed.data, usage };
    }
  }
  throw new Error("The lesson didn't come out in the expected shape. Try again.");
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").replace(/^http:/, "https:");
}

async function runConversation(
  input: ResearchInput,
  onEvent: (event: ResearchEvent) => void,
  usage: ResearchResult["usage"],
): Promise<{ text: string; foundUrls: Set<string> }> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: userPrompt(input) }];
  const foundUrls = new Set<string>();

  // A long server-tool turn can pause; resume it by sending the turn back.
  for (let turn = 0; turn < 4; turn++) {
    const stream = claude().beta.messages.stream({
      model: STRONG_MODEL,
      max_tokens: 32000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: "medium", format: zodOutputFormat(lessonOutputSchema) },
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: MAX_SEARCHES }],
      messages,
    });

    let announcedWriting = false;
    for await (const event of stream) {
      if (event.type === "content_block_start" && event.content_block.type === "text" && !announcedWriting) {
        announcedWriting = true;
        onEvent({ type: "writing" });
      }
      // Report each search as soon as its query is complete.
      if (event.type === "content_block_stop") {
        const block = stream.currentMessage?.content[event.index];
        if (block?.type === "server_tool_use" && block.name === "web_search") {
          const query = (block.input as { query?: unknown }).query;
          if (typeof query === "string") onEvent({ type: "search", query });
        }
      }
    }
    const message = await stream.finalMessage();

    usage.inputTokens +=
      message.usage.input_tokens +
      (message.usage.cache_creation_input_tokens ?? 0) +
      (message.usage.cache_read_input_tokens ?? 0);
    usage.outputTokens += message.usage.output_tokens;
    usage.searches += message.usage.server_tool_use?.web_search_requests ?? 0;

    for (const block of message.content) {
      // A successful search result is a list; an error result is an object.
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const result of block.content) foundUrls.add(normalizeUrl(result.url));
      }
    }

    if (message.stop_reason === "refusal") {
      throw new Error("Claude declined to research this topic.");
    }
    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: message.content });
      continue;
    }

    // With structured output the JSON is the final text block.
    const text = message.content.findLast((b) => b.type === "text");
    return { text: text?.type === "text" ? text.text : "", foundUrls };
  }
  throw new Error("Research took too many steps. Try again.");
}
