import { z } from "zod";
import { topicLevels } from "./topic";

// Favourite areas and the topic ideas suggested for them.

export const MAX_FAVORITE_AREAS = 20;
export const MAX_AREA_CHARS = 60;
export const SUGGESTIONS_PER_BATCH = 4;

export const areaSchema = z
  .string()
  .trim()
  .min(1, "Name the area first.")
  .max(MAX_AREA_CHARS, `Keep it under ${MAX_AREA_CHARS} characters.`);

export const favoriteAreasSchema = z.array(areaSchema).max(MAX_FAVORITE_AREAS, `Up to ${MAX_FAVORITE_AREAS} areas.`);

export const suggestionKinds = ["next_step", "fill_gap", "new_corner"] as const;

export const suggestionKindLabels: Record<(typeof suggestionKinds)[number], string> = {
  next_step: "Next step",
  fill_gap: "Fill a gap",
  new_corner: "New corner",
};

export const topicSuggestionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  kind: z.enum(suggestionKinds),
  why: z.string().trim().min(1),
  // Studied topics it builds on, matched to real topics.
  builds_on: z.array(z.object({ id: z.string(), title: z.string() })),
  level: z.enum(topicLevels),
  starter_questions: z.array(z.string().trim().min(1)).min(1).max(3),
});

export type TopicSuggestion = z.infer<typeof topicSuggestionSchema>;

export const suggestRequestSchema = z.object({
  area: areaSchema,
  // Titles already shown, so "More ideas" brings new ones.
  exclude: z.array(z.string().max(200)).max(40).default([]),
});
