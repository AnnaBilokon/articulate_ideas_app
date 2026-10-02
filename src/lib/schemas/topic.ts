import { z } from "zod";
import { tagSchema } from "./card";

// Input from the New topic form.

export const topicLevels = ["beginner", "intermediate", "advanced"] as const;

export const topicLevelLabels: Record<(typeof topicLevels)[number], string> = {
  beginner: "New to it",
  intermediate: "Know the basics",
  advanced: "Know it well",
};

export const isTopicLevel = (value: string | null): value is (typeof topicLevels)[number] =>
  topicLevels.includes(value as (typeof topicLevels)[number]);

export const MAX_USER_QUESTIONS = 10;
export const MAX_TAGS = 5;

// "Decision Making" -> "decision-making"
export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const newTopicSchema = z.object({
  title: z.string().trim().min(1, "Give the topic a title").max(200),
  level: z.enum(topicLevels),
  questions: z
    .array(z.string().trim().min(1).max(500))
    .max(MAX_USER_QUESTIONS, `At most ${MAX_USER_QUESTIONS} questions`),
  tags: z.array(tagSchema).max(MAX_TAGS, `At most ${MAX_TAGS} tags`),
});

export type TopicLevel = (typeof topicLevels)[number];
export type NewTopic = z.infer<typeof newTopicSchema>;
