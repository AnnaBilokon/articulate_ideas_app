"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { BookOpen, BookmarkPlus, Check, Lightbulb, Loader2, X } from "lucide-react";
import type { Tables } from "@/lib/database.types";
import { MAX_CONTEXT_CHARS, MAX_WORD_CHARS, MAX_WORD_WORDS, TRANSLATION_LANGUAGE } from "@/lib/schemas/vocabulary";

// Saving words to the vocabulary while reading: select any word in a lesson,
// or save a glossary word from its explanation.

type Entry = Pick<
  Tables<"vocabulary_words">,
  "id" | "word" | "part_of_speech" | "definition" | "usage_note" | "examples" | "translation"
>;

type Status =
  | { kind: "saving"; text: string }
  | { kind: "error"; text: string }
  // The word's explanation: just saved, or saved before.
  | { kind: "word"; entry: Entry; saved: boolean };

/** The sentence in `text` that contains `phrase`, for defining the word in context. */
export function sentenceAround(text: string, phrase: string): string {
  const sentences = text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]*["')\]]*\s*/g) ?? [text];
  const found = sentences.find((s) => s.toLowerCase().includes(phrase.toLowerCase()));
  return (found ?? text).trim().slice(0, MAX_CONTEXT_CHARS);
}

/**
 * save(word, context) sends a word to the vocabulary; render `toast` once to
 * show how it went: the word's explanation, or why it couldn't be saved.
 */
export function useSaveWord(topicId?: string) {
  const [status, setStatus] = useState<Status | null>(null);

  // An error goes away by itself; a word's explanation stays until it's closed.
  useEffect(() => {
    if (status?.kind !== "error") return;
    const timer = setTimeout(() => setStatus(null), 6000);
    return () => clearTimeout(timer);
  }, [status]);

  // Escape closes the explanation.
  useEffect(() => {
    if (status?.kind !== "word") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStatus(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status]);

  async function save(word: string, context?: string) {
    setStatus({ kind: "saving", text: word });
    try {
      const response = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ word, topicId, context }),
      });
      const body = (await response.json()) as { word?: Entry; existing?: Entry; error?: string };
      if (response.ok && body.word) setStatus({ kind: "word", entry: body.word, saved: true });
      else if (response.status === 409 && body.existing) setStatus({ kind: "word", entry: body.existing, saved: false });
      else throw new Error(body.error ?? "Could not save the word. Try again.");
    } catch (e) {
      setStatus({ kind: "error", text: e instanceof Error ? e.message : "Could not save the word. Try again." });
    }
  }

  const toast =
    status &&
    (status.kind === "word" ? (
      <WordCard entry={status.entry} saved={status.saved} onClose={() => setStatus(null)} />
    ) : (
      <div
        role="status"
        className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-lg"
      >
        {status.kind === "saving" ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
        ) : (
          <X className="size-4 shrink-0 text-coral-foreground" />
        )}
        <span className="flex-1">
          {status.kind === "saving" ? <>Explaining &ldquo;{status.text}&rdquo;…</> : status.text}
        </span>
      </div>
    ));

  return { save, saving: status?.kind === "saving", toast };
}

/** A word's explanation, shown right where it was saved. */
function WordCard({ entry, saved, onClose }: { entry: Entry; saved: boolean; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-label={`${entry.word}: explanation`}
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-h-[min(70vh,34rem)] max-w-md flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg"
    >
      <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm">
        {saved ? (
          <Check className="size-4 shrink-0 text-success" />
        ) : (
          <BookOpen className="size-4 shrink-0 text-info-foreground" />
        )}
        <span className="flex-1 text-muted-foreground">
          {saved ? "Saved to your vocabulary" : "Already in your vocabulary"}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="flex flex-col gap-2.5 overflow-y-auto px-4 py-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-lg font-semibold">{entry.word}</span>
          {entry.part_of_speech && (
            <span className="text-sm text-muted-foreground italic">{entry.part_of_speech}</span>
          )}
        </div>
        {entry.translation && (
          <div className="flex items-baseline gap-1.5 text-sm">
            <span className="rounded bg-info-soft px-1.5 text-xs font-medium text-info-foreground" title={TRANSLATION_LANGUAGE}>
              укр
            </span>
            <span>{entry.translation}</span>
          </div>
        )}
        <p className="leading-6">{entry.definition}</p>
        {entry.usage_note && (
          <p className="flex gap-2 text-sm leading-6">
            <Lightbulb className="mt-1 size-4 shrink-0 text-sunflower-foreground" />
            <span>
              <span className="font-medium">How to use it: </span>
              {entry.usage_note}
            </span>
          </p>
        )}
        {entry.examples.length > 0 && (
          <ul className="flex flex-col gap-1 pl-5 text-sm">
            {entry.examples.map((example) => (
              <li key={example} className="list-disc leading-6 italic marker:text-primary">
                {example}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex justify-end border-t px-4 py-2.5">
        <Link href="/vocabulary" className="text-sm font-medium text-primary hover:underline">
          Open Vocabulary
        </Link>
      </div>
    </div>
  );
}

type Selected = { text: string; context: string; left: number; top: number };

/**
 * Wraps lesson text: selecting a word or short phrase inside it shows an
 * "Add to vocabulary" button just below the selection.
 */
export function SelectionSaver({
  onSave,
  disabled,
  children,
}: {
  onSave: (word: string, context: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pick, setPick] = useState<Selected | null>(null);

  useEffect(() => {
    const update = () => {
      const selection = document.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return setPick(null);
      const range = selection.getRangeAt(0);
      if (!ref.current?.contains(range.commonAncestorContainer)) return setPick(null);
      // Trim spaces and punctuation picked up at either end.
      const text = selection
        .toString()
        .replace(/\s+/g, " ")
        .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
      if (!text || text.length > MAX_WORD_CHARS || text.split(" ").length > MAX_WORD_WORDS) return setPick(null);

      const node = range.commonAncestorContainer;
      const block = (node instanceof Element ? node : node.parentElement)?.closest("p, li");
      const rect = range.getBoundingClientRect();
      setPick({
        text,
        context: sentenceAround(block?.textContent ?? text, text),
        left: rect.left + rect.width / 2,
        top: rect.bottom,
      });
    };
    // The button is fixed to the screen, so hide it when the page scrolls.
    const hide = () => setPick(null);
    document.addEventListener("selectionchange", update);
    window.addEventListener("scroll", hide, { passive: true, capture: true });
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("selectionchange", update);
      window.removeEventListener("scroll", hide, { capture: true });
      window.removeEventListener("resize", hide);
    };
  }, []);

  return (
    <div ref={ref}>
      {children}
      {pick &&
        createPortal(
          <button
            type="button"
            disabled={disabled}
            // Keep the selection while pressing the button.
            onPointerDown={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onSave(pick.text, pick.context);
              document.getSelection()?.removeAllRanges();
              setPick(null);
            }}
            style={{
              // Below the selection (phones draw their own menu above it), inside the screen.
              top: Math.min(pick.top + 12, window.innerHeight - 52),
              left: Math.min(Math.max(8, pick.left - 96), window.innerWidth - 200),
            }}
            className="fixed z-50 flex w-48 items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-60"
          >
            <BookmarkPlus className="size-4" /> Add to vocabulary
          </button>,
          document.body,
        )}
    </div>
  );
}
