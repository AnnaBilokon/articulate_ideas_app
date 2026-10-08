import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, BookOpen, CheckCircle2, ChevronRight, Dumbbell, GraduationCap, Repeat, Sprout } from "lucide-react";
import { LightDayButton } from "@/components/light-day-button";
import { NextReviewLine } from "@/components/next-review-line";
import { PageHeader } from "@/components/page-header";
import { TagBadge, tagColorClass } from "@/components/tag-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { nextLearnStep, progressLine } from "@/lib/learn-flow";
import { LIGHT_DAY_CAP, reviewOverview } from "@/lib/reviews";
import { isTopicLevel, topicLevelLabels } from "@/lib/schemas/topic";
import { db } from "@/lib/supabase";
import { practiceOverview } from "@/lib/vocabulary";
import { cn } from "@/lib/utils";

export default async function Home() {
  await connection(); // Read fresh data on every visit, not once at build.
  const supabase = db();
  const [{ data: learning }, { count: learnedCount }, review, words] = await Promise.all([
    supabase
      .from("topics")
      .select(
        "id, title, level, created_at, topic_tags(tags(name)), lesson_chunks(id), dumps(id), recall_questions(attempts(score, created_at))",
      )
      .eq("status", "learning")
      .order("created_at", { ascending: false }),
    supabase.from("topics").select("id", { count: "exact", head: true }).eq("status", "learned"),
    reviewOverview(),
    practiceOverview(),
  ]);
  const topics = learning ?? [];

  const stats = [
    { label: "Due today", value: review.today.length, icon: Repeat, tone: "bg-sunflower-soft text-sunflower-foreground" },
    { label: "In progress", value: topics.length, icon: BookOpen, tone: "bg-info-soft text-info-foreground" },
    { label: "Learned", value: learnedCount ?? 0, icon: GraduationCap, tone: "bg-success-soft text-success-foreground" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title="Today" description="Recall what's due, then keep learning." />

      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} size="sm">
            <CardContent className="flex flex-col gap-2">
              <span className={cn("flex size-8 items-center justify-center rounded-lg", tone)}>
                <Icon className="size-4" />
              </span>
              <div className="text-2xl font-semibold tabular-nums">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {review.today.length > 0 ? (
        <Card className="bg-sunflower-soft/70 ring-sunflower/50">
          <CardContent className="flex flex-wrap items-center gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sunflower text-sunflower-foreground">
              <Repeat className="size-5" />
            </span>
            <div className="flex min-w-48 flex-1 flex-col gap-0.5">
              <div className="font-medium">
                {review.today.length} {review.today.length === 1 ? "question" : "questions"} to review
              </div>
              <div className="text-sm text-muted-foreground">
                {review.lightDay && "Light day. "}
                From {formatList([...new Set(review.today.map((q) => q.topicTitle))])}
                {review.overflow > 0 && `. ${review.overflow} more wait for the next days (${review.cap} a day)`}.
              </div>
            </div>
            <Link href="/review" className={cn(buttonVariants({ size: "lg" }), "h-10 px-4")}>
              Start review <ArrowRight className="size-4" />
            </Link>
            {(review.lightDay || review.today.length > LIGHT_DAY_CAP) && (
              <div className="basis-full">
                <LightDayButton lightDay={review.lightDay} cap={LIGHT_DAY_CAP} />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-success-soft/60 ring-success/25">
          <CardContent className="flex items-center gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success text-white">
              <CheckCircle2 className="size-5" />
            </span>
            <div>
              {review.reviewedToday > 0 ? (
                <div className="font-medium">
                  Done for today: you reviewed {review.reviewedToday}{" "}
                  {review.reviewedToday === 1 ? "question" : "questions"}
                </div>
              ) : (
                <div className="font-medium">All caught up</div>
              )}
              {review.overflow > 0 ? (
                <div className="text-muted-foreground">
                  {review.overflow} more {review.overflow === 1 ? "question is" : "questions are"} due and will come in
                  the next days.
                </div>
              ) : (
                <NextReviewLine dueAt={review.nextDueAt} />
              )}
              {review.lightDay && review.overflow > 0 && (
                <div className="-ml-2 pt-1">
                  <LightDayButton lightDay cap={LIGHT_DAY_CAP} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {words.due > 0 && (
        <Link
          href="/vocabulary/practice"
          className="group -mt-4 flex items-center gap-3 rounded-xl bg-muted/60 p-3 transition-colors hover:bg-muted"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-background text-primary">
            <Dumbbell className="size-4" />
          </span>
          <span className="flex-1">
            <span className="block font-medium">
              {words.due} {words.due === 1 ? "word" : "words"} to practice
            </span>
            <span className="block text-sm text-muted-foreground">From your vocabulary</span>
          </span>
          <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Continue learning</h2>
        {topics.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {topics.map((topic) => {
              const tags = topic.topic_tags.flatMap((tt) => (tt.tags ? [tt.tags.name] : []));
              const next = nextLearnStep({ hasLesson: topic.lesson_chunks.length > 0, hasDump: topic.dumps.length > 0 });
              const status = next
                ? `Next: ${next}`
                : (progressLine(topic.recall_questions, topic.created_at) ?? "Learned · in your reviews");
              return (
                <li key={topic.id}>
                  <Link href={`/topics/${topic.id}`} className="group block">
                    <Card size="sm" className="transition-shadow group-hover:shadow-md group-hover:ring-primary/30">
                      <CardContent className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-xl text-base font-semibold",
                            tagColorClass(tags[0] ?? topic.title),
                          )}
                          aria-hidden
                        >
                          {topic.title.trim().charAt(0).toUpperCase()}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <div className="truncate font-medium">{topic.title}</div>
                          <div className="text-sm text-muted-foreground">{status}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {isTopicLevel(topic.level) && (
                              <Badge variant="secondary">{topicLevelLabels[topic.level]}</Badge>
                            )}
                            {tags.map((tag) => (
                              <TagBadge key={tag} name={tag} />
                            ))}
                          </div>
                        </div>
                        <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <Card className="border-dashed">
            <CardHeader className="items-center text-center">
              <span className="mx-auto mb-1 flex size-12 items-center justify-center rounded-full bg-accent text-primary">
                <Sprout className="size-6" />
              </span>
              <CardTitle>Start your first topic</CardTitle>
              <CardDescription>
                Pick something you want to understand deeply. You&apos;ll learn it in short chunks, then recall it.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Link href="/topics/new" className={buttonVariants({ size: "lg" })}>
                New topic
              </Link>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}

// "A", "A and B", "A, B and C"
function formatList(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
