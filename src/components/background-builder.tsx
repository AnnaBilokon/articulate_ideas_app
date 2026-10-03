"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const POLL_MS = 5000;
// Background builds take under a minute; wait a bit longer than that.
const BUILD_WINDOW_MS = 2 * 60 * 1000;

/**
 * For things Claude builds in the background (the Topic Card, Think deeper
 * questions). Shortly after the step they follow, wait for them, refreshing
 * the page data; after that, offer a button that builds them on request.
 */
export function BackgroundBuilder({
  endpoint,
  startedAt,
  waitingText,
  buttonText,
  icon,
}: {
  endpoint: string;
  startedAt: string | null; // when the background build would have started
  waitingText: string;
  buttonText: string;
  icon: React.ReactNode;
}) {
  const router = useRouter();
  const [waiting, setWaiting] = useState(startedAt !== null);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!waiting || startedAt === null) return;
    const remaining = BUILD_WINDOW_MS - (Date.now() - new Date(startedAt).getTime());
    const poll = setInterval(() => router.refresh(), POLL_MS);
    const stop = setTimeout(() => setWaiting(false), Math.max(0, remaining));
    return () => {
      clearInterval(poll);
      clearTimeout(stop);
    };
  }, [waiting, startedAt, router]);

  async function build() {
    setBuilding(true);
    setError(null);
    try {
      const response = await fetch(endpoint, { method: "POST" });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Something went wrong. Try again.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setBuilding(false);
    }
  }

  if (waiting || building) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
        <Loader2 className="size-4 animate-spin" />
        {waitingText}
      </p>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="outline" onClick={build}>
        {error ? <RotateCcw className="size-4" /> : icon}
        {error ? "Try again" : buttonText}
      </Button>
      {error && <p className="text-sm text-coral-foreground">{error}</p>}
    </div>
  );
}
