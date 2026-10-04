import { z } from "zod";

// Output of the build_glossary and define_term calls.

export const MAX_GLOSSARY_TERMS = 15;
export const MAX_TERM_CHARS = 80;

export const glossaryTermSchema = z.object({
  term: z.string().trim().min(1).max(MAX_TERM_CHARS),
  // Expanded form for abbreviations; null otherwise.
  full_form: z.string().trim().min(1).nullable(),
  definition: z.string().trim().min(1),
  example: z.string().trim().min(1).nullable(),
});

export const buildGlossarySchema = z.object({
  terms: z.array(glossaryTermSchema).max(MAX_GLOSSARY_TERMS),
});

export const newTermInputSchema = z
  .string()
  .trim()
  .min(1, "Type a word or abbreviation.")
  .max(MAX_TERM_CHARS, `Keep it under ${MAX_TERM_CHARS} characters.`);

export type GlossaryTerm = z.infer<typeof glossaryTermSchema>;
