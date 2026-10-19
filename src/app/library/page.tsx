import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { topicStanding } from "@/lib/knowledge";
import { nextLearnStep } from "@/lib/learn-flow";
import { isTopicLevel } from "@/lib/schemas";
import { db } from "@/lib/supabase";
import { LibraryList, type LibraryTopic } from "./library-list";

export default async function LibraryPage() {
  await connection(); // Fresh on every visit: scores and due dates change.
  const { data } = await db()
    .from("topics")
    .select(
      "id, title, level, created_at, mastery_level, topic_tags(tags(name)), topic_cards(one_sentence), lesson_chunks(id), dumps(id), recall_questions(attempts(score, created_at), review_state(due_at))",
    )
    .neq("status", "inbox")
    .order("created_at", { ascending: false });

  const now = new Date();
  const topics: LibraryTopic[] = (data ?? []).map((t) => ({
    next: nextLearnStep({ hasLesson: t.lesson_chunks.length > 0, hasDump: t.dumps.length > 0 }),
    id: t.id,
    title: t.title,
    level: isTopicLevel(t.level) ? t.level : null,
    createdAt: t.created_at,
    stage: t.mastery_level,
    tags: t.topic_tags.flatMap((tt) => (tt.tags ? [tt.tags.name] : [])),
    summary: t.topic_cards?.one_sentence ?? null,
    ...topicStanding(
      { hasLesson: t.lesson_chunks.length > 0, hasDump: t.dumps.length > 0, questions: t.recall_questions },
      now,
    ),
  }));

  const learned = topics.filter((t) => t.learned);
  const scored = topics.filter((t) => t.score !== null);
  const average = scored.length > 0 ? scored.reduce((sum, t) => sum + t.score!, 0) / scored.length : null;
  const stats = [
    { label: "Topics", value: String(topics.length) },
    { label: "Learned", value: String(learned.length) },
    { label: "Average score", value: average === null ? "–" : `${average.toFixed(1)} / 5` },
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader
        title="Library"
        description="Everything you've studied: how well you know it, and when it comes back."
      />
      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ label, value }) => (
          <Card key={label} size="sm">
            <CardContent className="flex flex-col gap-1">
              <div className="text-2xl font-semibold tabular-nums text-heading">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <LibraryList topics={topics} />
    </main>
  );
}
