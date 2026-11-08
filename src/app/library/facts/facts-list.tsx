"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Search, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { QuickFact } from "@/lib/schemas";

const dayFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/Stockholm" });

// Every quick fact read, by topic, newest first, with a search over all of it.
export function FactsList({ facts }: { facts: QuickFact[] }) {
  const [query, setQuery] = useState("");

  if (facts.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl bg-muted/50 p-5">
        <p className="text-sm text-muted-foreground">The facts you read in Quick facts collect here, by topic.</p>
        <Link href="/learn/facts" className="flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline">
          <Zap className="size-4" /> Read your first quick fact
        </Link>
      </div>
    );
  }

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matching = facts.filter((f) => {
    const text = `${f.area} ${f.question} ${f.fact}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
  // Topics in the order of their newest fact.
  const areas = [...new Set(matching.map((f) => f.area))];

  return (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${facts.length} ${facts.length === 1 ? "fact" : "facts"}`}
          aria-label="Search quick facts"
          className="h-10 bg-background pl-9"
        />
      </div>
      {areas.length === 0 && <p className="text-sm text-muted-foreground">Nothing matches “{query}”.</p>}
      {areas.map((area) => {
        const inArea = matching.filter((f) => f.area === area);
        return (
          <section key={area} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-heading">
              {area} <span className="text-sm font-normal text-muted-foreground">{inArea.length}</span>
            </h2>
            <ul className="flex flex-col gap-2.5">
              {inArea.map((f) => (
                // The id lets a review link straight to its fact.
                <li key={f.id} id={f.id} className="flex scroll-mt-24 flex-col gap-1.5 rounded-xl bg-card p-4 ring-1 ring-foreground/10 target:ring-2 target:ring-primary">
                  <span className="font-medium text-heading">{f.question}</span>
                  <p className="text-sm leading-6">{f.fact}</p>
                  {f.whyInteresting && <p className="text-sm leading-6 text-muted-foreground italic">{f.whyInteresting}</p>}
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    {dayFormat.format(new Date(f.createdAt))}
                    {f.inReviews && (
                      <span className="flex items-center gap-1 text-success-foreground">
                        <Check className="size-3.5" /> In your reviews
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
