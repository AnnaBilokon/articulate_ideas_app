"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Feather } from "lucide-react";
import { Button } from "@/components/ui/button";

/** "Too much?": switches today to a light day with fewer reviews, or back to normal. */
export function LightDayButton({ lightDay, cap }: { lightDay: boolean; cap: number }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [refreshing, startTransition] = useTransition();

  async function toggle() {
    setSaving(true);
    try {
      await fetch("/api/review/light", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ on: !lightDay }),
      });
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  return (
    <Button variant="ghost" size="sm" disabled={saving || refreshing} onClick={toggle} className="text-muted-foreground">
      <Feather className="size-3.5" />
      {lightDay ? "Back to normal" : `Too much? Just ${cap} today`}
    </Button>
  );
}
