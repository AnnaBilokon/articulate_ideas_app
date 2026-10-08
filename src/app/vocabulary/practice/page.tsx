import Link from "next/link";
import { connection } from "next/server";
import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDue } from "@/lib/schedule";
import { dueWords, practiceOverview } from "@/lib/vocabulary";
import { PracticeSession } from "./practice-session";

export default async function PracticePage() {
  await connection(); // What's due changes with every answer.
  const [words, { due, nextDueAt }] = await Promise.all([dueWords(), practiceOverview()]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title="Word practice" back={{ href: "/vocabulary", label: "Vocabulary" }}>
        <p className="text-sm text-muted-foreground">
          {words.length > 0
            ? `${words.length} ${words.length === 1 ? "word" : "words"}${due > words.length ? ` of ${due} due` : ""}: say what it means, and use it in a sentence.`
            : "Words come back here on the day they're due."}
        </p>
      </PageHeader>
      {words.length > 0 ? (
        <PracticeSession words={words} />
      ) : (
        <Card className="bg-success-soft/60 ring-success/25">
          <CardContent className="flex items-center gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success text-white">
              <CheckCircle2 className="size-5" />
            </span>
            <div className="flex flex-1 flex-col gap-0.5">
              <div className="font-medium">No words to practice right now</div>
              <div className="text-muted-foreground">
                {nextDueAt ? `Next practice ${formatDue(nextDueAt)}.` : "Add words to your vocabulary to practice them."}
              </div>
            </div>
            <Link href="/vocabulary" className={buttonVariants({ variant: "outline" })}>
              Vocabulary
            </Link>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
