"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteTopic } from "./actions";

// Two steps: the first click asks, the second deletes.
export function DeleteTopic({ topicId, title }: { topicId: string; title: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <div className="flex justify-center border-t pt-6">
        <Button variant="ghost" className="text-muted-foreground hover:text-coral-foreground" onClick={() => setConfirming(true)}>
          <Trash2 className="size-4" />
          Delete topic
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-coral-soft p-4 ring-1 ring-coral/30" role="alertdialog" aria-labelledby="delete-title">
      <p id="delete-title" className="font-medium text-coral-foreground">
        Delete “{title}”?
      </p>
      <p className="text-sm">
        This permanently removes its lesson, Topic Card, questions, and everything you&apos;ve answered. Tags stay.
      </p>
      {error && <p className="text-sm text-coral-foreground">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteTopic(topicId);
              // Only returns on failure; success redirects to Today.
              setError(result.error);
            })
          }
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          Delete for good
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
