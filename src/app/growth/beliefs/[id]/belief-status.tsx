"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, RotateCcw, Trash2, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BeliefStatus } from "@/lib/schemas";
import { deleteBelief, setBeliefStatus } from "../actions";

export function BeliefStatusActions({ beliefId, status }: { beliefId: string; status: BeliefStatus }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const next: BeliefStatus = status === "working_on" ? "let_go" : "working_on";
  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        className="h-auto w-fit py-2 whitespace-normal"
        disabled={pending}
        onClick={() => start(async () => setError((await setBeliefStatus(beliefId, next)).error))}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : status === "working_on" ? (
          <Wind className="size-4" />
        ) : (
          <RotateCcw className="size-4" />
        )}
        {status === "working_on" ? "It doesn't hold me back any more: let it go" : "Back to working on it"}
      </Button>
      {error && <p className="text-sm text-coral-foreground">{error}</p>}
    </div>
  );
}

// Two steps: the first click asks, the second deletes.
export function DeleteBelief({ beliefId }: { beliefId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <Button variant="ghost" className="w-fit text-muted-foreground hover:text-coral-foreground" onClick={() => setConfirming(true)}>
        <Trash2 className="size-4" /> Delete
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-coral-soft p-4 ring-1 ring-coral/30" role="alertdialog" aria-labelledby="delete-belief">
      <p id="delete-belief" className="font-medium text-coral-foreground">
        Delete this belief and everything you wrote about it?
      </p>
      {error && <p className="text-sm text-coral-foreground">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await deleteBelief(beliefId);
              if (result.error) setError(result.error);
              else router.push("/growth/beliefs");
            })
          }
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete for good
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
