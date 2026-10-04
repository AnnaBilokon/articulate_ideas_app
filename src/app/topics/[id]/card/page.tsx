import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookA, Brain, Lightbulb, Link2, Lock, PenLine, Telescope, TriangleAlert } from "lucide-react";
import { BackgroundBuilder } from "@/components/background-builder";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CriticalKind, RecallQuestionType } from "@/lib/schemas";
import { db } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { GlossaryEditor } from "./glossary-editor";

const kindStyles: Record<CriticalKind, { label: string; className: string }> = {
  assumptions: { label: "Assumptions", className: "bg-sunflower-soft text-sunflower-foreground" },
  evidence: { label: "Evidence", className: "bg-info-soft text-info-foreground" },
  counterargument: { label: "Counterargument", className: "bg-coral-soft text-coral-foreground" },
  implications: { label: "Implications", className: "bg-success-soft text-success-foreground" },
  perspectives: { label: "Perspectives", className: "bg-tag-2 text-tag-2-foreground" },
  transfer: { label: "Transfer", className: "bg-tag-5 text-tag-5-foreground" },
};

const typeStyles: Record<RecallQuestionType, { label: string; className: string }> = {
  why: { label: "Why", className: "bg-sunflower-soft text-sunflower-foreground" },
  how: { label: "How", className: "bg-info-soft text-info-foreground" },
  compare: { label: "Compare", className: "bg-tag-2 text-tag-2-foreground" },
  apply: { label: "Apply", className: "bg-success-soft text-success-foreground" },
};

export default async function TopicCardPage({ params }: PageProps<"/topics/[id]/card">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: topic } = await db()
    .from("topics")
    .select(
      "title, researched_at, dumps(id), topic_cards(one_sentence, paragraph, analogy, counterpoint, connects_to, created_at), recall_questions(text, type, position), critical_questions(text, kind, considerations, position), glossary_terms(id, term, full_form, definition, example, source, created_at)",
    )
    .eq("id", id)
    .order("position", { referencedTable: "recall_questions" })
    .order("position", { referencedTable: "critical_questions" })
    .order("created_at", { referencedTable: "glossary_terms" })
    .maybeSingle();
  if (!topic) notFound();
  const card = topic.topic_cards;
  if (!card) redirect(`/topics/${id}`);

  // Recall first: the card stays locked until the first brain dump.
  if (topic.dumps.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
        <PageHeader title={topic.title} back={{ href: `/topics/${id}`, label: "Topic" }} />
        <Card className="bg-sunflower-soft/60 ring-sunflower/40">
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-sunflower text-sunflower-foreground">
              <Lock className="size-5" />
            </span>
            <div className="text-lg font-semibold">Your Topic Card opens after your brain dump</div>
            <p className="max-w-md text-muted-foreground">
              Write down everything you remember first. Pulling it from memory before you see the summary is what
              makes it stick.
            </p>
            <Link href={`/topics/${id}/dump`} className={cn(buttonVariants({ size: "lg" }), "mt-1 h-10 px-4")}>
              <PenLine className="size-4" /> Start brain dump
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader title={topic.title} back={{ href: `/topics/${id}`, label: "Topic" }}>
        <p className="text-sm text-muted-foreground">Topic card</p>
      </PageHeader>

      <Card className="gap-0 py-0">
        <CardContent className="flex flex-col gap-4 border-l-4 border-primary p-5 sm:p-7">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">In one sentence</span>
          <p className="text-xl leading-snug font-medium text-balance sm:text-2xl">{card.one_sentence}</p>
          <p className="text-base leading-7 text-foreground/90">{card.paragraph}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-sunflower-soft ring-sunflower/40">
          <CardContent className="flex flex-col gap-2">
            <span className="flex items-center gap-2 font-medium text-sunflower-foreground">
              <Lightbulb className="size-4" /> Analogy
            </span>
            <p className="leading-6">{card.analogy}</p>
          </CardContent>
        </Card>
        <Card className="bg-coral-soft ring-coral/30">
          <CardContent className="flex flex-col gap-2">
            <span className="flex items-center gap-2 font-medium text-coral-foreground">
              <TriangleAlert className="size-4" /> Common mistake
            </span>
            <p className="leading-6">{card.counterpoint}</p>
          </CardContent>
        </Card>
      </div>

      {card.connects_to.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Link2 className="size-4" /> Connects to
          </span>
          {card.connects_to.map((c) => (
            <span key={c} className="rounded-full bg-info-soft px-2.5 py-1 text-xs font-medium text-info-foreground">
              {c}
            </span>
          ))}
        </div>
      )}

      <Card id="glossary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookA className="size-4 text-info" /> Glossary
          </CardTitle>
          <CardDescription>
            Hard words and abbreviations from the lesson, in plain language. They&apos;re also explained inside the
            lesson: hover or tap a dotted word.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GlossaryEditor topicId={id} terms={topic.glossary_terms} startedAt={topic.researched_at} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="size-4 text-primary" /> Recall questions
          </CardTitle>
          <CardDescription>
            {topic.recall_questions.length} questions for your quiz and reviews. The answer keys stay hidden until you
            answer.
          </CardDescription>
          <CardAction>
            <Link href={`/topics/${id}/quiz`} className={buttonVariants({ size: "sm" })}>
              Start quiz
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-2">
            {topic.recall_questions.map((q, i) => {
              const style = typeStyles[q.type as RecallQuestionType] ?? typeStyles.why;
              return (
                <li key={q.position} className="flex items-start gap-3 rounded-lg bg-muted/60 px-3 py-2.5">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                    {i + 1}
                  </span>
                  <span className="flex-1 pt-0.5">{q.text}</span>
                  <Badge className={cn("mt-0.5", style.className)}>{style.label}</Badge>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <Card id="think-deeper" className="ring-tag-2-foreground/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Telescope className="size-4 text-tag-2-foreground" /> Think deeper
          </CardTitle>
          <CardDescription>
            Open questions with no single right answer. Think one through, or write a paragraph, before opening the
            hints.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topic.critical_questions.length > 0 ? (
            <ol className="flex flex-col gap-3">
              {topic.critical_questions.map((q) => {
                const style = kindStyles[q.kind as CriticalKind] ?? kindStyles.evidence;
                return (
                  <li key={q.position} className="flex flex-col gap-2 rounded-xl border bg-background p-4">
                    <Badge className={cn("w-fit", style.className)}>{style.label}</Badge>
                    <p className="leading-6 font-medium">{q.text}</p>
                    <details className="group">
                      <summary className="cursor-pointer text-sm text-muted-foreground select-none hover:text-foreground">
                        Things to consider
                      </summary>
                      <ul className="mt-2 flex flex-col gap-1 pl-5 text-sm">
                        {q.considerations.map((c) => (
                          <li key={c} className="list-disc marker:text-tag-2-foreground">
                            {c}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                );
              })}
            </ol>
          ) : (
            <BackgroundBuilder
              endpoint={`/api/topics/${id}/critical`}
              startedAt={card.created_at}
              waitingText="Writing your Think deeper questions…"
              buttonText="Create Think deeper questions"
              icon={<Telescope className="size-4" />}
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
