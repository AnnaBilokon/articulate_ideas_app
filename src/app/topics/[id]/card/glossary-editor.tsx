"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookA, Loader2, Plus, X } from "lucide-react";
import { BackgroundBuilder } from "@/components/background-builder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_TERM_CHARS } from "@/lib/schemas/glossary";

type Term = {
  id: string;
  term: string;
  full_form: string | null;
  definition: string;
  example: string | null;
  source: string;
};

export function GlossaryEditor({
  topicId,
  terms,
  startedAt,
}: {
  topicId: string;
  terms: Term[];
  startedAt: string | null; // when the background build would have started
}) {
  const router = useRouter();
  const [newTerm, setNewTerm] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const builtByClaude = terms.some((t) => t.source === "claude");

  async function add() {
    setAdding(true);
    setError(null);
    try {
      const response = await fetch(`/api/topics/${topicId}/glossary`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ term: newTerm }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not add the term. Try again.");
      setNewTerm("");
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add the term. Try again.");
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string) {
    setRemoving(id);
    setError(null);
    try {
      const response = await fetch(`/api/glossary/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not remove the term. Try again.");
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove the term. Try again.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!builtByClaude && (
        <BackgroundBuilder
          endpoint={`/api/topics/${topicId}/glossary`}
          startedAt={startedAt}
          waitingText="Building your glossary…"
          buttonText="Create glossary"
          icon={<BookA className="size-4" />}
        />
      )}

      {terms.length > 0 && (
        <dl className="flex flex-col divide-y">
          {terms.map((t) => (
            <div key={t.id} className="group flex items-start gap-3 py-3 first:pt-0">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <dt className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold">{t.term}</span>
                  {t.full_form && <span className="text-sm text-muted-foreground">{t.full_form}</span>}
                  {t.source === "user" && (
                    <Badge variant="outline" className="text-muted-foreground">
                      added by you
                    </Badge>
                  )}
                </dt>
                <dd className="leading-6">{t.definition}</dd>
                {t.example && <dd className="text-sm text-muted-foreground italic">e.g. {t.example}</dd>}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${t.term}`}
                disabled={removing === t.id}
                onClick={() => remove(t.id)}
                className="text-muted-foreground opacity-60 group-hover:opacity-100 hover:text-coral-foreground"
              >
                {removing === t.id ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
              </Button>
            </div>
          ))}
        </dl>
      )}

      <form
        className="flex flex-col gap-2 border-t pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (newTerm.trim() && !adding) add();
        }}
      >
        <label htmlFor="new-term" className="text-sm font-medium">
          Add a word or abbreviation
        </label>
        <div className="flex gap-2">
          <Input
            id="new-term"
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            maxLength={MAX_TERM_CHARS}
            placeholder="e.g. base rate"
            disabled={adding}
            className="h-10 bg-background px-3 md:text-base"
          />
          <Button type="submit" size="lg" className="h-10 px-4" disabled={adding || !newTerm.trim()}>
            {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Explain
          </Button>
        </div>
        {error && (
          <p className="text-sm text-coral-foreground" role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
