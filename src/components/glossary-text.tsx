"use client";

import { Fragment, useState } from "react";
import { cn } from "@/lib/utils";

export type GlossaryEntry = {
  term: string;
  full_form: string | null;
  definition: string;
  example: string | null;
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// "FSRS", "A/B": matched with exact capitals, so "IT" doesn't fire on "it".
const isAbbreviation = (term: string) => /[A-Z]/.test(term) && term === term.toUpperCase();

/**
 * Splits text into plain parts and glossary terms. Each term is marked at its
 * first appearance in the text it's given (a lesson part); `seen` carries
 * that across the paragraphs of one part.
 */
function segments(text: string, terms: GlossaryEntry[], seen: Set<string>) {
  if (terms.length === 0) return [text];
  const sorted = [...terms].sort((a, b) => b.term.length - a.term.length);
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])(${sorted.map((t) => escape(t.term)).join("|")})(?:s|es)?(?![\\p{L}\\p{N}])`,
    "giu",
  );
  const byLower = new Map(sorted.map((t) => [t.term.toLowerCase(), t]));

  const out: (string | { text: string; entry: GlossaryEntry })[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const entry = byLower.get(match[1].toLowerCase());
    if (!entry || seen.has(entry.term) || (isAbbreviation(entry.term) && match[1] !== entry.term)) continue;
    seen.add(entry.term);
    out.push(text.slice(last, match.index), { text: match[0], entry });
    last = match.index + match[0].length;
  }
  out.push(text.slice(last));
  return out;
}

export function GlossaryText({ text, terms, seen }: { text: string; terms: GlossaryEntry[]; seen: Set<string> }) {
  return (
    <>
      {segments(text, terms, seen).map((part, i) =>
        typeof part === "string" ? <Fragment key={i}>{part}</Fragment> : <TermHint key={i} text={part.text} entry={part.entry} />,
      )}
    </>
  );
}

// Dotted-underlined term; the definition shows on hover, or on tap on a phone.
function TermHint({ text, entry }: { text: string; entry: GlossaryEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="group relative inline">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        // inline (not the default inline-block) so punctuation after a term can't wrap away from it
        className="inline cursor-help underline decoration-primary/60 decoration-dotted decoration-2 underline-offset-4 hover:decoration-primary"
      >
        {text}
      </button>
      <span
        role="tooltip"
        className={cn(
          "absolute top-full left-0 z-20 mt-1 w-[min(20rem,80vw)] flex-col gap-1 rounded-xl border bg-popover p-3 text-left text-sm leading-6 font-normal text-popover-foreground shadow-lg",
          open ? "flex" : "hidden group-hover:flex",
        )}
      >
        <span>
          <strong>{entry.term}</strong>
          {entry.full_form && <span className="text-muted-foreground"> · {entry.full_form}</span>}
        </span>
        <span>{entry.definition}</span>
        {entry.example && <span className="text-muted-foreground italic">e.g. {entry.example}</span>}
      </span>
    </span>
  );
}
