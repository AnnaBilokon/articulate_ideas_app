"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChallengeKind } from "@/lib/schemas";

// Makes a new challenge from the topic's lesson, then opens it.
export function NewChallengeButton({
  topicId,
  kind,
  label = "New challenge",
  variant = "default",
}: {
  topicId: string;
  kind: ChallengeKind;
  label?: string;
  variant?: "default" | "outline";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function make() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/topics/${topicId}/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const body = (await response.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!response.ok || !body?.id) throw new Error(body?.error ?? "Something went wrong. Try again.");
      router.push(`/challenges/${body.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button onClick={make} disabled={pending} variant={variant} className="w-fit">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {pending ? "Writing your challenge…" : label}
      </Button>
      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
