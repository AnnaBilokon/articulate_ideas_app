"use client";

import Link from "next/link";
import { useState } from "react";
import { BookmarkCheck, ChevronRight, MessagesSquare, Repeat, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Exploration } from "@/lib/schemas";

const dayFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/Stockholm" });

// Every Explore chat, newest first, with a search over the chats and their notes.
export function ChatsList({ chats }: { chats: Exploration[] }) {
  const [query, setQuery] = useState("");

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl bg-muted/50 p-5">
        <p className="text-sm text-muted-foreground">
          Chats from Explore collect here, with the notes you save from them.
        </p>
        <Link href="/learn" className="flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline">
          <MessagesSquare className="size-4" /> Explore something you&apos;re curious about
        </Link>
      </div>
    );
  }

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matching = chats.filter((c) => {
    const text = [
      c.title,
      c.area,
      c.question,
      c.note?.summary,
      ...(c.note?.key_ideas ?? []),
      ...c.messages.map((m) => m.text),
    ]
      .join(" ")
      .toLowerCase();
    return words.every((w) => text.includes(w));
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${chats.length} ${chats.length === 1 ? "chat" : "chats"}`}
          aria-label="Search chats"
          className="h-10 bg-background pl-9"
        />
      </div>
      {matching.length === 0 && <p className="text-sm text-muted-foreground">Nothing matches “{query}”.</p>}
      <ul className="flex flex-col gap-2.5">
        {matching.map((c) => {
          const inReviews = c.reviewDrafts.filter((d) => d.inReviews).length;
          return (
            <li key={c.id}>
              <Link
                href={`/explore/${c.id}`}
                className="group flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-shadow hover:shadow-md hover:ring-primary/30"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-medium text-heading">{c.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.area} · {dayFormat.format(new Date(c.createdAt))}
                    </span>
                  </span>
                  <span className="line-clamp-2 text-sm leading-6 text-muted-foreground">{c.note?.summary ?? c.question}</span>
                  <span className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {c.note ? (
                      <span className="flex items-center gap-1 text-success-foreground">
                        <BookmarkCheck className="size-3.5" /> Note saved
                      </span>
                    ) : (
                      <span>Chat only, no note yet</span>
                    )}
                    {inReviews > 0 && (
                      <span className="flex items-center gap-1">
                        <Repeat className="size-3.5" /> {inReviews} in your reviews
                      </span>
                    )}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
