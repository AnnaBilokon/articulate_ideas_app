"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_EXPLORE_CHARS, type Exploration } from "@/lib/schemas";

// "What are you curious about?": type a question and a chat opens with a short
// intro to it.

const EXAMPLES = ["What is a RAG system?", "Why do we procrastinate?", "How does compound interest work?"];

export function ExploreStart() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = (await response.json().catch(() => null)) as { exploration?: Exploration; error?: string } | null;
      if (!response.ok || !data?.exploration) throw new Error(data?.error ?? "Something went wrong. Try again.");
      router.push(`/explore/${data.exploration.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void start(question);
      }}
    >
      <Textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void start(question);
          }
        }}
        rows={2}
        maxLength={MAX_EXPLORE_CHARS}
        disabled={busy}
        placeholder="Ask anything: a word you heard at work, how something works, why people do things…"
        aria-label="What you're curious about"
        className="min-h-16 bg-background px-3 py-2.5 md:text-base"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="lg" className="h-10 px-4" disabled={busy || !question.trim()}>
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Writing a short intro…
            </>
          ) : (
            <>
              Explore <ArrowRight className="size-4" />
            </>
          )}
        </Button>
        {!question.trim() &&
          !busy &&
          EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setQuestion(example)}
              className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-highlight hover:text-highlight-foreground"
            >
              {example}
            </button>
          ))}
      </div>
      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
