"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

const TOOLTIP_WIDTH = 320;
const EDGE = 8; // keep this far from the screen edges
const ROOM_BELOW = 220; // flip above the term when there's less space than this below it

type Placement = { left: number; width: number } & ({ top: number } | { bottom: number });

// Where to draw the tooltip on screen: below the term, or above it near the
// bottom of the screen, and always fully inside the screen horizontally.
function placeNear(anchor: HTMLElement): Placement {
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(TOOLTIP_WIDTH, window.innerWidth - EDGE * 2);
  const left = Math.min(Math.max(EDGE, rect.left), window.innerWidth - width - EDGE);
  return window.innerHeight - rect.bottom < ROOM_BELOW && rect.top > ROOM_BELOW
    ? { left, width, bottom: window.innerHeight - rect.top + 6 }
    : { left, width, top: rect.bottom + 6 };
}

/**
 * Dotted-underlined term; the definition shows on hover, or on tap on a
 * phone. The tooltip is drawn at the top level of the page (a portal with
 * fixed positioning), so cards that clip their contents can't cut it off.
 */
function TermHint({ text, entry }: { text: string; entry: GlossaryEntry }) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [pinned, setPinned] = useState(false); // opened by a tap or click
  const [hovered, setHovered] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const tooltipId = useId();
  const show = (pinned || hovered) && placement !== null;

  const place = () => {
    if (anchorRef.current) setPlacement(placeNear(anchorRef.current));
  };

  // The tooltip is fixed to the screen, so close it when the page scrolls or resizes.
  useEffect(() => {
    if (!pinned && !hovered) return;
    const close = () => {
      setPinned(false);
      setHovered(false);
    };
    window.addEventListener("scroll", close, { passive: true, capture: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
    };
  }, [pinned, hovered]);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-expanded={pinned}
        aria-describedby={show ? tooltipId : undefined}
        onClick={() => {
          place();
          setPinned((p) => !p);
        }}
        onMouseEnter={() => {
          place();
          setHovered(true);
        }}
        onMouseLeave={() => setHovered(false)}
        onFocus={place}
        onBlur={() => setPinned(false)}
        // inline (not the default inline-block) so punctuation after a term can't wrap away from it
        className="inline cursor-help underline decoration-primary/60 decoration-dotted decoration-2 underline-offset-4 hover:decoration-primary"
      >
        {text}
      </button>
      {show &&
        createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            style={placement}
            className="pointer-events-none fixed z-50 flex flex-col gap-1 rounded-xl border bg-popover p-3 text-left text-sm leading-6 font-normal text-popover-foreground shadow-lg"
          >
            <span>
              <strong>{entry.term}</strong>
              {entry.full_form && <span className="text-muted-foreground"> · {entry.full_form}</span>}
            </span>
            <span>{entry.definition}</span>
            {entry.example && <span className="text-muted-foreground italic">e.g. {entry.example}</span>}
          </span>,
          document.body,
        )}
    </>
  );
}
