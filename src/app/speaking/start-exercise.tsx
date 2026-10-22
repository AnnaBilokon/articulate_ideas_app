"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Pick a topic, then make the next exercise on it.
export function StartExercise({ topics }: { topics: string[] }) {
  const router = useRouter();
  const [topic, setTopic] = useState(topics[0]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/speaking/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const body = (await response.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!response.ok || !body?.id) throw new Error(body?.error ?? "Something went wrong. Try again.");
      router.push(`/speaking/exercises/${body.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {topics.length > 1 && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Topic">
          {topics.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={topic === t}
              onClick={() => setTopic(t)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                topic === t ? "bg-highlight text-highlight-foreground" : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      <Button size="lg" onClick={start} disabled={pending} className="h-10 w-fit px-4">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
        {pending ? "Your coach is preparing a scene…" : topics.length > 1 ? `Start: ${topic}` : "Start an exercise"}
      </Button>
      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
