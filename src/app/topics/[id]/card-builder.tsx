"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const POLL_MS = 5000;
// The background build takes about a minute; wait a bit longer than that.
const BUILD_WINDOW_MS = 2 * 60 * 1000;

/**
 * Shown when a topic has a lesson but no card. Right after research the card
 * is usually being built in the background, so wait for it first (refreshing
 * the page data); otherwise offer to build it.
 */
export function CardBuilder({ topicId, researchedAt }: { topicId: string; researchedAt: string | null }) {
  const router = useRouter();
  const [waiting, setWaiting] = useState(researchedAt !== null);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!waiting || researchedAt === null) return;
    const remaining = BUILD_WINDOW_MS - (Date.now() - new Date(researchedAt).getTime());
    const poll = setInterval(() => router.refresh(), POLL_MS);
    const stop = setTimeout(() => setWaiting(false), Math.max(0, remaining));
    return () => {
      clearInterval(poll);
      clearTimeout(stop);
    };
  }, [waiting, researchedAt, router]);

  async function build() {
    setBuilding(true);
    setError(null);
    try {
      const response = await fetch(`/api/topics/${topicId}/card`, { method: "POST" });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not build the card. Try again.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build the card. Try again.");
      setBuilding(false);
    }
  }

  if (waiting || building) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
        <Loader2 className="size-4 animate-spin" />
        Preparing your Topic Card and recall questions…
      </p>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="outline" onClick={build}>
        {error ? <RotateCcw className="size-4" /> : <Layers className="size-4" />}
        {error ? "Try again" : "Build topic card"}
      </Button>
      {error && <p className="text-sm text-coral-foreground">{error}</p>}
    </div>
  );
}
