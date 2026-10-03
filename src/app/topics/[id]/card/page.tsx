import { notFound, redirect } from "next/navigation";
import { Brain, Lightbulb, Link2, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecallQuestionType } from "@/lib/schemas";
import { db } from "@/lib/supabase";
import { cn } from "@/lib/utils";

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
      "title, topic_cards(one_sentence, paragraph, analogy, counterpoint, connects_to), recall_questions(text, type, position)",
    )
    .eq("id", id)
    .order("position", { referencedTable: "recall_questions" })
    .maybeSingle();
  if (!topic) notFound();
  const card = topic.topic_cards;
  if (!card) redirect(`/topics/${id}`);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader title={topic.title} back={{ href: `/topics/${id}`, label: "Topic" }}>
        <p className="text-sm text-muted-foreground">
          Topic card · in the full flow this opens after your brain dump (coming soon).
        </p>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="size-4 text-primary" /> Recall questions
          </CardTitle>
          <CardDescription>
            {topic.recall_questions.length} questions for your quiz and reviews. The answer keys stay hidden until you
            answer.
          </CardDescription>
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
    </main>
  );
}
