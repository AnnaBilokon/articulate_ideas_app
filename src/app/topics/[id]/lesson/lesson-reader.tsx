"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, PartyPopper } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Chunk = { title: string; content: string };

// Paragraphs, plus "- " lines as bullet lists.
function ChunkBody({ content }: { content: string }) {
  const blocks = content.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="flex flex-col gap-4 text-base leading-7 sm:text-[1.0625rem]">
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim());
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="flex flex-col gap-1.5 pl-5">
              {lines.map((l, j) => (
                <li key={j} className="list-disc marker:text-primary">
                  {l.slice(2)}
                </li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{lines.join(" ")}</p>;
      })}
    </div>
  );
}

export function LessonReader({ topicId, chunks }: { topicId: string; chunks: Chunk[] }) {
  const [index, setIndex] = useState(0);
  const finished = index >= chunks.length;
  const chunk = chunks[Math.min(index, chunks.length - 1)];

  return (
    <div className="flex flex-col gap-6">
      {/* Progress: one segment per chunk */}
      <div className="flex gap-1.5" aria-label={`Chunk ${Math.min(index + 1, chunks.length)} of ${chunks.length}`}>
        {chunks.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i < index ? "bg-primary" : i === index ? "bg-sunflower" : "bg-border",
            )}
          />
        ))}
      </div>

      {finished ? (
        <Card className="bg-success-soft/60 ring-success/25">
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-success text-white">
              <PartyPopper className="size-6" />
            </span>
            <div className="text-lg font-semibold">Lesson done</div>
            <p className="max-w-md text-muted-foreground">
              Next comes the brain dump: write everything you remember, without looking back. It&apos;s coming in the
              next build step.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Button variant="outline" onClick={() => setIndex(0)}>
                Read again
              </Button>
              <Link href={`/topics/${topicId}`} className={buttonVariants()}>
                Back to topic
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-0 py-0">
          <CardContent className="flex flex-col gap-5 p-5 sm:p-8">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Part {index + 1} of {chunks.length}
              </span>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{chunk.title}</h2>
            </div>
            <ChunkBody content={chunk.content} />
          </CardContent>
          <div className="flex items-center justify-between gap-4 border-t bg-muted/50 px-5 py-4 sm:px-8">
            <Button variant="ghost" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
              Back
            </Button>
            <Button
              size="lg"
              className="h-10 px-4"
              onClick={() => {
                setIndex((i) => i + 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              {index === chunks.length - 1 ? (
                <>
                  Finish lesson <Check className="size-4" />
                </>
              ) : (
                <>
                  Ready for next <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
