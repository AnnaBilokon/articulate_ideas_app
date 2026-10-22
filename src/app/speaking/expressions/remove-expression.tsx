"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeSpeakingExpression } from "../actions";

export function RemoveExpression({ id }: { id: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        className="text-coral-foreground"
        onClick={() => startTransition(async () => setError((await removeSpeakingExpression(id)).error))}
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />} Remove
      </Button>
      {error && <span className="text-xs text-coral-foreground">{error}</span>}
    </div>
  );
}
