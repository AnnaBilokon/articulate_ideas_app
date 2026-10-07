"use client";

import Link from "next/link";
import { ArrowRight, Loader2, MessageSquareText, PartyPopper, Telescope } from "lucide-react";
import { NextReview, RecallSession, ScoreSummary, type SessionQuestion } from "@/components/recall-session";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type QuizSummary = { average: number; mastery: string | null; nextDueAt: string | null };

export function QuizSession({ topicId, questions }: { topicId: string; questions: SessionQuestion[] }) {
  return (
    <RecallSession<QuizSummary>
      mode="quiz"
      questions={questions}
      finishUrl={`/api/topics/${topicId}/quiz/finish`}
      renderEnd={({ firstTries, summary, finishing }) => (
        <Card className="bg-success-soft/50 ring-success/25">
          <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-success text-white">
              <PartyPopper className="size-6" />
            </span>
            <div className="text-lg font-semibold">Quiz done</div>
            {finishing ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <ScoreSummary firstTries={firstTries} />
                {summary?.mastery === "recalled" && (
                  <p className="max-w-md text-sm">
                    Mastery: <strong>Recalled</strong>. Spaced reviews will keep it that way.
                  </p>
                )}
                {summary?.nextDueAt && <NextReview dueAt={summary.nextDueAt} />}
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <Link href={`/topics/${topicId}/teach`} className={buttonVariants({ variant: "outline" })}>
                    <MessageSquareText className="size-4" /> Teach it back
                  </Link>
                  <Link href={`/topics/${topicId}/card#think-deeper`} className={buttonVariants({ variant: "outline" })}>
                    <Telescope className="size-4" /> Think deeper
                  </Link>
                  <Link href={`/topics/${topicId}`} className={buttonVariants()}>
                    Back to topic <ArrowRight className="size-4" />
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    />
  );
}
