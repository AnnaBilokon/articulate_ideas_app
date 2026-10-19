import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Brain, Repeat, Target } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mostMissed, questionProgress, scoreTone, stageLabels, toImprove, topicStanding } from "@/lib/knowledge";
import { db } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// How well one topic is known: what to work on, the points missed most
// often, and every question's score history and place in the schedule.
export default async function TopicProgressPage({ params }: PageProps<"/topics/[id]/progress">) {
  await connection(); // Fresh on every visit: scores and due dates change.
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: topic } = await db()
    .from("topics")
    .select(
      "title, mastery_level, lesson_chunks(id), dumps(id), recall_questions(id, position, text, attempts(score, confidence, created_at, feedback), review_state(due_at, step))",
    )
    .eq("id", id)
    .order("position", { referencedTable: "recall_questions" })
    .maybeSingle();
  if (!topic) notFound();

  const now = new Date();
  const standing = topicStanding(
    { hasLesson: topic.lesson_chunks.length > 0, hasDump: topic.dumps.length > 0, questions: topic.recall_questions },
    now,
  );
  const questions = topic.recall_questions.map((q) => questionProgress(q, now));
  const improve = toImprove(questions);
  const missed = mostMissed(topic.recall_questions);
  const back = { href: `/topics/${id}`, label: topic.title };

  if (standing.answered === 0) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
        <PageHeader title="How you're doing" back={back} />
        <p className="text-muted-foreground">
          {standing.learned
            ? `No answers yet. The questions come back ${standing.nextReview ?? "in your reviews"}, or take the quiz now.`
            : "Finish day 1 first: the lesson and the brain dump. Then your answers show up here."}
        </p>
      </main>
    );
  }

  const summary = [
    { label: "Score", value: standing.score === null ? "–" : `${standing.score.toFixed(1)} / 5` },
    { label: "Can answer", value: `${standing.canAnswer} of ${standing.questions}` },
    { label: "Stage", value: (topic.mastery_level && stageLabels[topic.mastery_level]) ?? "–" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader
        title="How you're doing"
        description={
          standing.dueNow > 0
            ? `${standing.dueNow} ${standing.dueNow === 1 ? "question is" : "questions are"} due now.`
            : standing.nextReview
              ? `The next questions come back ${standing.nextReview}.`
              : undefined
        }
        back={back}
      />

      <div className="grid grid-cols-3 gap-3">
        {summary.map(({ label, value }) => (
          <Card key={label} size="sm">
            <CardContent className="flex flex-col gap-1">
              <div className="text-2xl font-semibold tabular-nums text-heading">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-4 text-primary" /> Work on these
          </CardTitle>
          <CardDescription>
            {improve.length > 0
              ? "Your latest answer scored under 4. Confident misses first: they're the ones to fix."
              : "Every answered question scored 4 or more last time. Nice."}
          </CardDescription>
        </CardHeader>
        {improve.length > 0 && (
          <CardContent className="flex flex-col gap-4">
            <ul className="flex flex-col gap-4">
              {improve.map((q) => (
                <li key={q.id} className="flex flex-col gap-1.5 border-t pt-4 first:border-t-0 first:pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{q.text}</p>
                    <ScorePill score={q.latest!} />
                  </div>
                  {q.confidentMiss && (
                    <p className="w-fit rounded-md bg-coral-soft px-2 py-0.5 text-xs font-medium text-coral-foreground">
                      Confident miss: you were sure, but it was off
                    </p>
                  )}
                  {q.missed.length > 0 && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">You missed: </span>
                      {q.missed.join("; ")}
                    </div>
                  )}
                  {q.mistake && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Why: </span>
                      {q.mistake}
                    </div>
                  )}
                  {q.nextReview && (
                    <div className="text-sm text-muted-foreground">
                      {q.nextReview === "due now" ? "Due now: it's in today's review" : `Comes back ${q.nextReview}`}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <Link href={`/topics/${id}/quiz`} className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
              <Brain className="size-4" /> Practise in a quiz
            </Link>
            <p className="-mt-2 text-xs text-muted-foreground">
              Practice doesn&apos;t move the schedule: only answers on review days do.
            </p>
          </CardContent>
        )}
      </Card>

      {missed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Points you miss most</CardTitle>
            <CardDescription>Key points left out of your answers more than once.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {missed.map(({ point, count }) => (
                <li key={point} className="flex items-start justify-between gap-3 text-sm">
                  <span>{point}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">{count}×</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-heading">Every question</h2>
        <ul className="flex flex-col gap-2">
          {questions.map((q) => (
            <li key={q.id}>
              <Card size="sm">
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{q.text}</p>
                    {q.latest !== null && <ScorePill score={q.latest} />}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                    {q.history.length > 0 ? (
                      <span className="flex items-center gap-1" aria-label={`Scores, oldest first: ${q.history.join(", ")}`}>
                        {q.history.map((s, i) => (
                          <span
                            key={i}
                            className={cn("flex size-5 items-center justify-center rounded text-[11px] font-semibold", scoreTone(s))}
                            aria-hidden
                          >
                            {s}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span>Not answered yet</span>
                    )}
                    {q.ladder && (
                      <span className="flex items-center gap-1">
                        <Repeat className="size-3.5" /> {q.ladder}
                      </span>
                    )}
                    {q.nextReview && <span>{q.nextReview === "due now" ? "due now" : `next ${q.nextReview}`}</span>}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function ScorePill({ score }: { score: number }) {
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", scoreTone(score))}>
      {score} / 5
    </span>
  );
}
