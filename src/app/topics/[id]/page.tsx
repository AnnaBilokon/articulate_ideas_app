import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Brain,
  FilePenLine,
  ExternalLink,
  Check,
  HelpCircle,
  Layers,
  Lock,
  MessageSquareText,
  PenLine,
  Telescope,
} from "lucide-react";
import { BackgroundBuilder } from "@/components/background-builder";
import { PageHeader } from "@/components/page-header";
import { TagBadge } from "@/components/tag-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { nextLearnStep, progressLine } from "@/lib/learn-flow";
import { dumpRecordSchema } from "@/lib/schemas/grading";
import { MAX_QUIZ_QUESTIONS } from "@/lib/schemas/card";
import { isTopicLevel, topicLevelLabels } from "@/lib/schemas/topic";
import { formatDue } from "@/lib/schedule";
import { db } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { DeleteTopic } from "./delete-topic";
import { ResearchPanel } from "./research-panel";

// The learn flow from PLAN.md. Day 1 is the lesson and the brain dump; the
// questions then come back in the next day's review, and the last three steps
// are optional. "soon" steps aren't built yet.
const steps = [
  { label: "Pretest", hint: "Guess first; it makes answers stick", icon: HelpCircle, soon: true },
  { label: "Lesson", hint: "Short parts, with a quick recall after each · about 10 min", icon: BookOpen },
  { label: "Brain dump", hint: "Put the whole topic together · about 5 min", icon: PenLine },
  { label: "Topic card", hint: "The essentials, unlocked after the dump · 2 min", icon: Layers },
  { label: "Quiz", hint: "The questions come back in tomorrow's review anyway · about 10 min", icon: Brain, optional: true },
  { label: "Teach-back", hint: "Explain it in your own words · about 10 min", icon: MessageSquareText, optional: true },
  { label: "Think deeper", hint: "Open questions with no single right answer · about 10 min", icon: Telescope, optional: true },
];
const LESSON = 1;
const DUMP = 2;

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default async function TopicPage({ params }: PageProps<"/topics/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: topic } = await db()
    .from("topics")
    .select(
      "title, level, created_at, researched_at, source_text, user_questions(text, position, is_suggested), topic_tags(tags(name)), lesson_chunks(id), sources(url, title), topic_cards(id), recall_questions(id, attempts(score, created_at), review_state(due_at)), critical_questions(id), dumps(feedback, created_at), explanations(score, created_at)",
    )
    .eq("id", id)
    .order("position", { referencedTable: "user_questions" })
    .order("created_at", { referencedTable: "dumps", ascending: false })
    .limit(1, { referencedTable: "dumps" })
    .order("created_at", { referencedTable: "explanations", ascending: false })
    .limit(1, { referencedTable: "explanations" })
    .maybeSingle();
  if (!topic) notFound();

  const tags = topic.topic_tags.flatMap((tt) => (tt.tags ? [tt.tags.name] : []));
  const hasLesson = topic.lesson_chunks.length > 0;
  const hasCard = Boolean(topic.topic_cards);
  const lastDump = topic.dumps[0] ? dumpRecordSchema.safeParse(topic.dumps[0].feedback) : null;
  const hasDump = topic.dumps.length > 0;
  const quizTaken = topic.recall_questions.some((q) => q.attempts.length > 0);
  const lastExplanation = topic.explanations[0];
  const dueDates = topic.recall_questions.flatMap((q) => (q.review_state ? [q.review_state.due_at] : [])).sort();
  const dueNow = dueDates.filter((d) => new Date(d) <= new Date()).length;
  // Day 1 needs the lesson, then the dump; after that nothing is "up next".
  const next = nextLearnStep({ hasLesson, hasDump });
  const currentStep = next === "Lesson" ? LESSON : next === "Brain dump" ? DUMP : -1;
  const doneSteps = [false, hasLesson, hasDump, hasDump, quizTaken, Boolean(lastExplanation), false];
  const progress = progressLine(topic.recall_questions, topic.created_at);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title={topic.title} back={{ href: "/", label: "Today" }}>
        <div className="flex flex-wrap gap-1.5">
          {isTopicLevel(topic.level) && <Badge variant="secondary">{topicLevelLabels[topic.level]}</Badge>}
          {tags.map((tag) => (
            <TagBadge key={tag} name={tag} />
          ))}
        </div>
      </PageHeader>

      {hasDump && (
        <Card className="bg-success-soft/60 ring-success/25">
          <CardContent className="flex items-center gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success text-white">
              <Check className="size-5" />
            </span>
            <div className="flex flex-col gap-0.5">
              <div className="font-medium">
                {dueNow > 0
                  ? `${dueNow} ${dueNow === 1 ? "question is" : "questions are"} due: review on Today`
                  : dueDates.length > 0
                    ? `Learned. The questions come back ${formatDue(dueDates[0])}`
                    : "Learned"}
              </div>
              <div className="text-sm text-muted-foreground">
                {progress ? `${progress}.` : "The quiz, teach-back and think deeper are optional extras."}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className={cn(!hasLesson && "ring-sunflower/60")}>
        <CardHeader>
          <CardTitle>Your lesson</CardTitle>
          {hasLesson && topic.researched_at && (
            <CardDescription>
              {topic.lesson_chunks.length} parts · {topic.source_text ? "built from your material" : "researched"} on{" "}
              {dateFormat.format(new Date(topic.researched_at))}
            </CardDescription>
          )}
          {topic.source_text !== null && (
            <CardAction>
              <Link href={`/topics/${id}/material`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <FilePenLine className="size-3.5" /> Edit material
              </Link>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {hasLesson ? (
            <>
              <div>
                <Link href={`/topics/${id}/lesson`} className={cn(buttonVariants({ size: "lg" }), "h-10 px-4")}>
                  Start lesson <ArrowRight className="size-4" />
                </Link>
              </div>
              {topic.sources.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground select-none hover:text-foreground">
                    Sources ({topic.sources.length})
                  </summary>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {topic.sources.map((s) => (
                      <li key={s.url}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-start gap-1.5 text-sm text-info-foreground hover:underline"
                        >
                          <ExternalLink className="mt-0.5 size-3.5 shrink-0" />
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <div className="flex flex-col gap-3 border-t pt-4">
                {hasDump ? (
                  <Link
                    href={`/topics/${id}/dump`}
                    className="group flex items-center gap-3 rounded-xl bg-success-soft/70 p-3 transition-colors hover:bg-success-soft"
                  >
                    <span className="flex size-9 items-center justify-center rounded-lg bg-success text-white">
                      <PenLine className="size-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block font-medium">Brain dump</span>
                      <span className="block text-sm text-muted-foreground">
                        {lastDump?.success
                          ? `${lastDump.data.right.length} right · ${lastDump.data.missed.length} missed · ${lastDump.data.wrong.length} to correct · ${lastDump.data.nudges === 0 ? "no nudges" : `${lastDump.data.nudges} ${lastDump.data.nudges === 1 ? "nudge" : "nudges"}`}`
                          : "Done"}
                      </span>
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ) : (
                  <Link
                    href={`/topics/${id}/dump`}
                    className="group flex items-center gap-3 rounded-xl bg-sunflower-soft p-3 ring-1 ring-sunflower/60 transition-colors hover:bg-sunflower-soft/70"
                  >
                    <span className="flex size-9 items-center justify-center rounded-lg bg-sunflower text-sunflower-foreground">
                      <PenLine className="size-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block font-medium">Brain dump</span>
                      <span className="block text-sm text-muted-foreground">
                        After the lesson: write everything you remember. Unlocks your Topic Card.
                      </span>
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}
                {hasCard && !hasDump ? (
                  <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-3 text-muted-foreground">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-background">
                      <Lock className="size-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block font-medium">Topic card</span>
                      <span className="block text-sm">Ready, and opens after your brain dump</span>
                    </span>
                  </div>
                ) : hasCard ? (
                  <Link
                    href={`/topics/${id}/card`}
                    className="group flex items-center gap-3 rounded-xl bg-sunflower-soft p-3 transition-colors hover:bg-sunflower-soft/70"
                  >
                    <span className="flex size-9 items-center justify-center rounded-lg bg-sunflower text-sunflower-foreground">
                      <Layers className="size-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block font-medium">Topic card</span>
                      <span className="block text-sm text-muted-foreground">
                        Summary, analogy, {topic.recall_questions.length} recall questions
                        {topic.critical_questions.length > 0 &&
                          ` and ${topic.critical_questions.length} Think deeper questions`}
                      </span>
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ) : (
                  <BackgroundBuilder
                    endpoint={`/api/topics/${id}/card`}
                    startedAt={topic.researched_at}
                    waitingText="Preparing your Topic Card and recall questions…"
                    buttonText="Build topic card"
                    icon={<Layers className="size-4" />}
                  />
                )}
                {hasDump && topic.recall_questions.length > 0 && (
                  <Link href={`/topics/${id}/quiz`} className="group flex items-center gap-3 rounded-xl bg-muted/60 p-3 transition-colors hover:bg-muted">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-background text-primary">
                      <Brain className="size-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block font-medium">
                        {quizTaken ? "Quiz again" : "Quiz now"}{" "}
                        <span className="font-normal text-muted-foreground">· optional</span>
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {Math.min(topic.recall_questions.length, MAX_QUIZ_QUESTIONS)} questions, scored out of 5
                        {dueNow > 0
                          ? ` · ${dueNow} due for review`
                          : dueDates.length > 0 && ` · next review ${formatDue(dueDates[0])}`}
                      </span>
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}
                {hasDump && hasCard && (
                  <Link href={`/topics/${id}/teach`} className="group flex items-center gap-3 rounded-xl bg-muted/60 p-3 transition-colors hover:bg-muted">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-background text-primary">
                      <MessageSquareText className="size-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block font-medium">
                        Teach-back <span className="font-normal text-muted-foreground">· optional</span>
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {lastExplanation?.score != null
                          ? `Last explanation: ${lastExplanation.score}/5`
                          : "Explain the whole topic in your own words"}
                      </span>
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}
              </div>
            </>
          ) : (
            <ResearchPanel topicId={id} fromMaterial={Boolean(topic.source_text)} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Learning path</CardTitle>
          <CardDescription>Day 1 is the lesson and the brain dump, about 15 minutes. The rest is optional.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="isolate flex flex-col">
            {steps.map(({ label, hint, icon: Icon, soon, optional }, i) => {
              const isCurrent = i === currentStep;
              const isDone = doneSteps[i];
              return (
                <li key={label} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < steps.length - 1 && (
                    <span className="absolute top-9 bottom-1 left-4.25 w-px bg-border" aria-hidden />
                  )}
                  {isCurrent && (
                    <span
                      className="absolute -inset-x-2 -top-2 bottom-3 -z-10 rounded-xl bg-sunflower-soft"
                      aria-hidden
                    />
                  )}
                  <span
                    className={cn(
                      "z-0 flex size-9 shrink-0 items-center justify-center rounded-full border",
                      isCurrent
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : isDone
                          ? "border-success/40 bg-success-soft text-success-foreground"
                          : "bg-background text-muted-foreground",
                    )}
                  >
                    {isDone ? <Check className="size-4" /> : <Icon className="size-4" />}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col pt-1.5">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-medium", !isCurrent && !isDone && "text-muted-foreground")}>
                        {label}
                      </span>
                      {isCurrent && <Badge className="bg-sunflower text-sunflower-foreground">Up next</Badge>}
                      {(soon || optional) && (
                        <Badge variant="outline" className="text-muted-foreground">
                          {soon ? "soon" : "optional"}
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">{hint}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
          <CardDescription>
            {hasLesson ? "The lesson answers these." : "The lesson answers these first."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topic.user_questions.length > 0 ? (
            <ol className="flex flex-col gap-2">
              {topic.user_questions.map((q, i) => (
                <li key={q.position} className="flex gap-3 rounded-lg bg-muted/60 px-3 py-2.5">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                    {i + 1}
                  </span>
                  <span className="flex-1 pt-0.5">{q.text}</span>
                  {q.is_suggested && (
                    <Badge className="mt-0.5 bg-info-soft text-info-foreground">Suggested</Badge>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground">No questions. The lesson will cover the essentials.</p>
          )}
        </CardContent>
      </Card>

      <DeleteTopic topicId={id} title={topic.title} />
    </main>
  );
}
