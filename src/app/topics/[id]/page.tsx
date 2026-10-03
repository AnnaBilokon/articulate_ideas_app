import { notFound } from "next/navigation";
import { BookOpen, Brain, HelpCircle, Layers, MessageSquareText, PenLine } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TagBadge } from "@/components/tag-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isTopicLevel, topicLevelLabels } from "@/lib/schemas/topic";
import { db } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// The learn flow from PLAN.md. Only the first step is "next" until the flow is built.
const steps = [
  { label: "Pretest", hint: "Guess first; it makes answers stick", icon: HelpCircle },
  { label: "Lesson", hint: "Short chunks, one at a time", icon: BookOpen },
  { label: "Brain dump", hint: "Write everything you remember", icon: PenLine },
  { label: "Topic card", hint: "The essentials, unlocked after the dump", icon: Layers },
  { label: "Quiz", hint: "Recall questions, scored out of 5", icon: Brain },
  { label: "Explain", hint: "Say it in your own words", icon: MessageSquareText },
];
const currentStep = 0;

export default async function TopicPage({ params }: PageProps<"/topics/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: topic } = await db()
    .from("topics")
    .select("title, level, status, user_questions(text, position), topic_tags(tags(name))")
    .eq("id", id)
    .order("position", { referencedTable: "user_questions" })
    .maybeSingle();
  if (!topic) notFound();

  const tags = topic.topic_tags.flatMap((tt) => (tt.tags ? [tt.tags.name] : []));

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

      <Card>
        <CardHeader>
          <CardTitle>Learning path</CardTitle>
          <CardDescription>The next steps open as they&apos;re built.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="isolate flex flex-col">
            {steps.map(({ label, hint, icon: Icon }, i) => {
              const isCurrent = i === currentStep;
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
                        : "bg-background text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col pt-1.5">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-medium", !isCurrent && "text-muted-foreground")}>{label}</span>
                      {isCurrent && (
                        <Badge className="bg-sunflower text-sunflower-foreground">Up next</Badge>
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
          <CardTitle>Your questions</CardTitle>
          <CardDescription>The lesson answers these first.</CardDescription>
        </CardHeader>
        <CardContent>
          {topic.user_questions.length > 0 ? (
            <ol className="flex flex-col gap-2">
              {topic.user_questions.map((q, i) => (
                <li key={q.position} className="flex gap-3 rounded-lg bg-muted/60 px-3 py-2.5">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{q.text}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground">No questions. The lesson will cover the essentials.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
