import Link from "next/link";
import { connection } from "next/server";
import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { NextReviewLine } from "@/components/next-review-line";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { reviewOverview } from "@/lib/reviews";
import { ReviewSession } from "./review-session";

export default async function ReviewPage() {
  await connection(); // What's due changes every day, and with every answer.
  const { today, overflow, cap, nextDueAt } = await reviewOverview();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title="Review" back={{ href: "/", label: "Today" }}>
        <p className="text-sm text-muted-foreground">
          {today.length > 0
            ? `${today.length} ${today.length === 1 ? "question" : "questions"} due, from all your topics, mixed.`
            : "Questions come back here on the day they're due."}
        </p>
      </PageHeader>
      {today.length > 0 ? (
        <ReviewSession questions={today} />
      ) : (
        <Card className="bg-success-soft/60 ring-success/25">
          <CardContent className="flex items-center gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success text-white">
              <CheckCircle2 className="size-5" />
            </span>
            <div className="flex flex-1 flex-col gap-0.5">
              <div className="font-medium">Nothing to review right now</div>
              {overflow > 0 ? (
                <div className="text-muted-foreground">
                  You&apos;ve done today&apos;s {cap}. {overflow} more will come in the next days.
                </div>
              ) : (
                <NextReviewLine dueAt={nextDueAt} />
              )}
            </div>
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Today
            </Link>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
