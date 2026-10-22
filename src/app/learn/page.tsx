import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowRight,
  BookOpen,
  BookmarkCheck,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Flame,
  GraduationCap,
  Repeat,
  Sparkles,
  Sprout,
  WholeWord,
} from "lucide-react";
import { LearningTree } from "@/components/learning-tree";
import { LightDayButton } from "@/components/light-day-button";
import { NextReviewLine } from "@/components/next-review-line";
import { PageHeader } from "@/components/page-header";
import { TagBadge, tagColorClass } from "@/components/tag-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { favoriteAreas } from "@/lib/discover";
import { nextLearnStep } from "@/lib/learn-flow";
import { LIGHT_DAY_CAP, reviewOverview } from "@/lib/reviews";
import { savedQuestionsToLearn } from "@/lib/saved-questions";
import { learningStreak } from "@/lib/streak";
import { isTopicLevel, topicLevelLabels } from "@/lib/schemas/topic";
import { db } from "@/lib/supabase";
import { practiceOverview } from "@/lib/vocabulary";
import { cn } from "@/lib/utils";

export default async function LearnToday() {
  await connection(); // Read fresh data on every visit, not once at build.
  const supabase = db();
  const [{ data: all }, review, words, areas, savedCount, streak, { count: termCount }] = await Promise.all([
    supabase
      .from("topics")
      .select("id, title, level, created_at, topic_tags(tags(name)), lesson_chunks(id), dumps(id)")
      .neq("status", "inbox")
      .order("created_at", { ascending: false }),
    reviewOverview(),
    practiceOverview(),
    favoriteAreas(),
    savedQuestionsToLearn(),
    learningStreak(),
    supabase.from("glossary_terms").select("id", { count: "exact", head: true }),
  ]);
  // Learned once day 1 is done; the rest are still in progress.
  const topics = (all ?? []).filter((t) => nextLearnStep({ hasLesson: t.lesson_chunks.length > 0, hasDump: t.dumps.length > 0 }));
  const learnedCount = (all ?? []).length - topics.length;

  const stats = [
    {
      label: streak.today || streak.current === 0 ? "Day streak" : "Day streak · keep it today",
      value: streak.current,
      icon: Flame,
      tone: "bg-tag-3 text-tag-3-foreground",
      title: `Days in a row with recall. Best: ${streak.best}.`,
    },
    { label: "Due today", value: review.today.length, icon: Repeat, tone: "bg-sunflower-soft text-sunflower-foreground" },
    { label: "In progress", value: topics.length, icon: BookOpen, tone: "bg-info-soft text-info-foreground" },
    { label: "Learned", value: learnedCount, icon: GraduationCap, tone: "bg-success-soft text-success-foreground" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title="Today" description="Recall what's due, then keep learning." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone, title }) => (
          <Card key={label} size="sm" title={title}>
            <CardContent className="flex flex-col gap-2">
              <span className={cn("flex size-8 items-center justify-center rounded-lg", tone)}>
                <Icon className="size-4" />
              </span>
              <div className="text-2xl font-semibold tabular-nums text-heading">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
          <LearningTree
            days={streak.days}
            topics={learnedCount}
            learnedToday={streak.today}
            className="h-44 w-auto shrink-0 sm:h-48"
          />
          <div className="flex flex-col gap-1.5 text-center sm:text-left">
            <h2 className="text-lg font-semibold tracking-tight text-heading">Your tree</h2>
            <p className="text-sm text-muted-foreground">
              {streak.days === 0
                ? "A seed for now. Every day you learn, it grows a leaf."
                : `${streak.days} ${streak.days === 1 ? "leaf" : "leaves"}, one for every day you've learned, and ${learnedCount} ${learnedCount === 1 ? "fruit" : "fruits"}, one for every topic learned.`}
            </p>
            <p className="font-medium">
              {streak.today ? "Today's leaf is in." : "Recall something today to grow a new leaf."}
            </p>
          </div>
        </CardContent>
      </Card>

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

      {(words.due > 0 || (termCount ?? 0) > 0) && (
        <div className="-mt-4 flex flex-col gap-2">
          {words.due > 0 && (
            <Link
              href="/vocabulary/practice"
              className="group flex items-center gap-3 rounded-xl bg-muted/60 p-3 transition-colors hover:bg-muted"
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
          {(termCount ?? 0) > 0 && (
            <Link
              href="/terms"
              className="group flex items-center gap-3 rounded-xl bg-muted/60 p-3 transition-colors hover:bg-muted"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-background text-primary">
                <WholeWord className="size-4" />
              </span>
              <span className="flex-1">
                <span className="block font-medium">Term practice</span>
                <span className="block text-sm text-muted-foreground">
                  Read an explanation, name the term · {Math.min(termCount ?? 0, 10)} from your topics
                </span>
              </span>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Continue learning</h2>
          {learnedCount > 0 && (
            <Link href="/library" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              All {learnedCount + topics.length} {learnedCount + topics.length === 1 ? "topic" : "topics"}
            </Link>
          )}
        </div>
        {topics.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {topics.map((topic) => {
              const tags = topic.topic_tags.flatMap((tt) => (tt.tags ? [tt.tags.name] : []));
              const next = nextLearnStep({ hasLesson: topic.lesson_chunks.length > 0, hasDump: topic.dumps.length > 0 });
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
                          <div className="text-sm text-muted-foreground">Next: {next}</div>
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
        ) : learnedCount > 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground">
              Nothing half-finished. Your {learnedCount} learned {learnedCount === 1 ? "topic is" : "topics are"} in
              the{" "}
              <Link href="/library" className="font-medium text-foreground underline-offset-4 hover:underline">
                Library
              </Link>
              .
            </p>
            <Link href="/discover" className={cn(buttonVariants(), "w-fit")}>
              <Sparkles className="size-4" /> Find something new to learn
            </Link>
          </div>
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

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Learn something new</h2>
          {areas.length > 0 && (
            <Link href="/discover" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Edit areas
            </Link>
          )}
        </div>
        {areas.length > 0 ? (
          <>
            <p className="-mt-1 text-sm text-muted-foreground">
              Pick an area for ideas that build on what you&apos;ve learned.
            </p>
            <div className="flex flex-wrap gap-2">
              {areas.map((area) => (
                <Link
                  key={area}
                  href={`/discover?area=${encodeURIComponent(area)}`}
                  className="rounded-full bg-muted px-3.5 py-1.5 text-sm font-medium transition-colors hover:bg-highlight hover:text-highlight-foreground"
                >
                  {area}
                </Link>
              ))}
            </div>
          </>
        ) : (
          <Link
            href="/discover"
            className="group flex items-center gap-3 rounded-xl bg-muted/60 p-3 transition-colors hover:bg-muted"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-background text-primary">
              <Sparkles className="size-4" />
            </span>
            <span className="flex-1">
              <span className="block font-medium">Add your favourite areas</span>
              <span className="block text-sm text-muted-foreground">
                Then get topic ideas that build on what you&apos;ve learned
              </span>
            </span>
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
        {savedCount > 0 && (
          <Link
            href="/library/questions"
            className="group flex items-center gap-3 rounded-xl bg-muted/60 p-3 transition-colors hover:bg-muted"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-background text-primary">
              <BookmarkCheck className="size-4" />
            </span>
            <span className="flex-1">
              <span className="block font-medium">
                {savedCount} saved {savedCount === 1 ? "question" : "questions"} to explore
              </span>
              <span className="block text-sm text-muted-foreground">Pick one and learn it as a new topic</span>
            </span>
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </section>
    </main>
  );
}

// "A", "A and B", "A, B and C"
function formatList(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
