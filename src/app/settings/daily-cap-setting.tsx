"use client";

import { useState, useTransition } from "react";
import { DAILY_CAP_OPTIONS, dailyCapHints } from "@/lib/reviews-shared";
import { cn } from "@/lib/utils";
import { saveDailyCap } from "./actions";

// How many review questions come each day, saved for every device.
export function DailyCapSetting({ cap: initialCap }: { cap: number }) {
  const [cap, setCap] = useState(initialCap);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const choose = (value: number) => {
    const previous = cap;
    setCap(value);
    setError(null);
    startSaving(async () => {
      const result = await saveDailyCap(value);
      if ("error" in result) {
        setCap(previous);
        setError(result.error);
      }
    });
  };

  const hint = dailyCapHints[cap as keyof typeof dailyCapHints];

  return (
    <section className="flex flex-col gap-3">
      <h2 id="cap-heading" className="font-semibold text-heading">
        Review questions per day
      </h2>
      <p className="-mt-1 text-sm text-muted-foreground">
        About a minute each. Questions over the limit wait for the next days, oldest first. Saved for every device.
      </p>
      <div role="radiogroup" aria-labelledby="cap-heading" className="flex flex-wrap gap-2">
        {DAILY_CAP_OPTIONS.map((value) => (
          <label
            key={value}
            className={cn(
              "flex min-w-14 cursor-pointer items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold tabular-nums transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
              cap === value ? "bg-card ring-2 ring-primary" : "bg-muted/60 text-muted-foreground hover:bg-muted",
            )}
          >
            <input
              type="radio"
              name="daily-cap"
              value={value}
              checked={cap === value}
              onChange={() => choose(value)}
              disabled={saving}
              className="sr-only"
            />
            {value}
          </label>
        ))}
      </div>
      {hint && (
        <p className="text-sm">
          {cap} a day keeps up with {hint} over the long run. Reviews grow for months as topics add up, so pick
          for the pace you want to keep.
        </p>
      )}
      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
