"use client";

import Link from "next/link";
import { ArrowRight, CircleDashed, Loader2, PartyPopper, Repeat } from "lucide-react";
import type { PracticeSummary } from "@/app/api/vocabulary/practice/finish/route";
import { NextReview, RecallSession, ScoreSummary } from "@/components/recall-session";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { practicePrompt } from "@/lib/schemas/vocabulary";

export function PracticeSession({ words }: { words: { id: string; word: string }[] }) {
  const wordById = new Map(words.map((w) => [w.id, w.word]));

  return (
    <RecallSession<PracticeSummary>
      mode="practice"
      questions={words.map((w) => ({ id: w.id, text: practicePrompt(w.word) }))}
      gradeUrl={(id) => `/api/vocabulary/${id}/grade`}
      finishUrl="/api/vocabulary/practice/finish"
      renderEnd={({ firstTries, summary, finishing }) => {
        const weak = firstTries.filter((t) => t.score <= 2).map((t) => wordById.get(t.question.id) ?? "");
        return (
          <div className="flex flex-col gap-5">
            <Card className="bg-success-soft/50 ring-success/25">
              <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-success text-white">
                  <PartyPopper className="size-6" />
                </span>
                <div className="text-lg font-semibold">Practice done</div>
                {finishing ? (
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <ScoreSummary firstTries={firstTries} />
                    {summary && summary.remaining > 0 ? (
                      <p className="text-sm">
                        {summary.remaining} more {summary.remaining === 1 ? "word is" : "words are"} due.
                      </p>
                    ) : (
                      summary?.nextDueAt && <NextReview dueAt={summary.nextDueAt} label="Next practice" />
                    )}
                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                      {summary && summary.remaining > 0 && (
                        // A full page load, so the next words are picked fresh.
                        <a href="/vocabulary/practice" className={buttonVariants({ variant: "outline" })}>
                          <Repeat className="size-4" /> Keep going
                        </a>
                      )}
                      <Link href="/vocabulary" className={buttonVariants()}>
                        Back to vocabulary <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {weak.length > 0 && (
              <Card className="bg-sunflower-soft/60 ring-sunflower/40">
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-2 font-medium text-sunflower-foreground">
                      <CircleDashed className="size-4" /> Words to look at again
                    </span>
                    <span className="text-sm text-muted-foreground">
                      These come back tomorrow. Reading their examples once more helps.
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {weak.map((word) => (
                      <span key={word} className="rounded-full bg-background/80 px-3 py-1 font-medium">
                        {word}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
      }}
    />
  );
}
