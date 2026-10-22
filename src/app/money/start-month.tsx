"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthSlug } from "@/lib/schemas";
import { startNextPeriod } from "./actions";

/** Starts the next pay period, with last month's expected amounts, and opens it. */
export function StartMonth({ label }: { label: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-1">
      <Button
        className="w-fit"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await startNextPeriod();
            if (result.month) router.push(`/money/months/${monthSlug(result.month)}`);
            setError(result.error);
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} {label}
      </Button>
      {error && <span className="text-sm text-coral-foreground">{error}</span>}
    </div>
  );
}
