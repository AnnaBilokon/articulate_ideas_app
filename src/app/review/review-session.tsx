"use client";

import Link from "next/link";
import { ArrowRight, CircleDashed, Loader2, PartyPopper, Repeat } from "lucide-react";
import type { ReviewSummary } from "@/app/api/review/finish/route";
import { NextReview, RecallSession, ScoreSummary, type SessionQuestion } from "@/components/recall-session";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ReviewSession({ questions }: { questions: SessionQuestion[] }) {
  return (
    <RecallSession<ReviewSummary>
      mode="review"
      questions={questions}
      finishUrl="/api/review/finish"
      renderEnd={({ firstTries, summary, finishing }) => {
        const weak = firstTries.filter((t) => t.score <= 2);
        return (
          <div className="flex flex-col gap-5">
            <Card className="bg-success-soft/50 ring-success/25">
              <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-success text-white">
                  <PartyPopper className="size-6" />
                </span>
                <div className="text-lg font-semibold">Review done</div>
                {finishing ? (
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <ScoreSummary firstTries={firstTries} />
                    {summary && summary.remaining > 0 ? (
                      <p className="text-sm">
                        {summary.remaining} more {summary.remaining === 1 ? "question is" : "questions are"} due today.
                      </p>
                    ) : summary && summary.overflow > 0 ? (
                      <p className="max-w-md text-sm">
                        That&apos;s today&apos;s {summary.cap}. {summary.overflow} more{" "}
                        {summary.overflow === 1 ? "question is" : "questions are"} due and will come in the next days,
                        oldest first.
                      </p>
                    ) : (
                      summary?.nextDueAt && <NextReview dueAt={summary.nextDueAt} />
                    )}
                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                      {summary && summary.remaining > 0 && (
                        // A full page load, so the next set is picked fresh.
                        <a href="/review" className={buttonVariants({ variant: "outline" })}>
                          <Repeat className="size-4" /> Keep going
                        </a>
                      )}
                      <Link href="/" className={buttonVariants()}>
                        Back to Today <ArrowRight className="size-4" />
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
                      <CircleDashed className="size-4" /> Weak spots
                    </span>
                    <span className="text-sm text-muted-foreground">
                      These come back tomorrow. A look at the topic card before then helps.
                    </span>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {weak.map(({ question }) => (
                      <li key={question.id} className="flex flex-col items-start gap-1 rounded-lg bg-background/70 px-3 py-2.5">
                        {question.topicId && question.topicTitle && (
                          <Link href={`/topics/${question.topicId}/card`} className="max-w-full">
                            <Badge variant="secondary" className="max-w-full truncate hover:bg-accent">
                              {question.topicTitle}
                            </Badge>
                          </Link>
                        )}
                        <span className="leading-6">{question.text}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        );
      }}
    />
  );
}
