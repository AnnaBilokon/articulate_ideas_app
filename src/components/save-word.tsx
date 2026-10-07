"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { BookmarkPlus, Check, Loader2, X } from "lucide-react";
import { MAX_CONTEXT_CHARS, MAX_WORD_CHARS, MAX_WORD_WORDS } from "@/lib/schemas/vocabulary";

// Saving words to the vocabulary while reading: select any word in a lesson,
// or save a glossary word from its explanation.

type Status = { kind: "saving" | "saved" | "error"; text: string };

/** The sentence in `text` that contains `phrase`, for defining the word in context. */
export function sentenceAround(text: string, phrase: string): string {
  const sentences = text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]*["')\]]*\s*/g) ?? [text];
  const found = sentences.find((s) => s.toLowerCase().includes(phrase.toLowerCase()));
  return (found ?? text).trim().slice(0, MAX_CONTEXT_CHARS);
}

/** save(word, context) sends a word to the vocabulary; render `toast` once to show how it went. */
export function useSaveWord(topicId?: string) {
  const [status, setStatus] = useState<Status | null>(null);

  // A result stays up for a few seconds; "saving" stays until it's done.
  useEffect(() => {
    if (!status || status.kind === "saving") return;
    const timer = setTimeout(() => setStatus(null), 6000);
    return () => clearTimeout(timer);
  }, [status]);

  async function save(word: string, context?: string) {
    setStatus({ kind: "saving", text: word });
    try {
      const response = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ word, topicId, context }),
      });
      const body = (await response.json()) as { word?: { word: string }; error?: string };
      if (!response.ok || !body.word) throw new Error(body.error ?? "Could not save the word. Try again.");
      setStatus({ kind: "saved", text: body.word.word });
    } catch (e) {
      setStatus({ kind: "error", text: e instanceof Error ? e.message : "Could not save the word. Try again." });
    }
  }

  const toast = status && (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-lg"
    >
      {status.kind === "saving" && <Loader2 className="size-4 shrink-0 animate-spin text-primary" />}
      {status.kind === "saved" && <Check className="size-4 shrink-0 text-success" />}
      {status.kind === "error" && <X className="size-4 shrink-0 text-coral-foreground" />}
      <span className="flex-1">
        {status.kind === "saving" && <>Explaining &ldquo;{status.text}&rdquo;…</>}
        {status.kind === "saved" && <>Saved &ldquo;{status.text}&rdquo; to your vocabulary.</>}
        {status.kind === "error" && status.text}
      </span>
      {status.kind !== "saving" && (
        <Link href="/vocabulary" className="font-medium text-primary hover:underline">
          Vocabulary
        </Link>
      )}
    </div>
  );

  return { save, saving: status?.kind === "saving", toast };
}

type Pick = { text: string; context: string; left: number; top: number };

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
  const [pick, setPick] = useState<Pick | null>(null);

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
