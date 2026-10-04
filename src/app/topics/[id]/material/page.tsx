import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/supabase";
import { MaterialEditor } from "./material-editor";

export default async function MaterialPage({ params }: PageProps<"/topics/[id]/material">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: topic } = await db()
    .from("topics")
    .select("title, source_text, lesson_chunks(id), dumps(id), recall_questions(attempts(id))")
    .eq("id", id)
    .maybeSingle();
  if (!topic) notFound();
  if (topic.source_text === null) redirect(`/topics/${id}`);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title={topic.title} back={{ href: `/topics/${id}`, label: "Topic" }}>
        <p className="text-sm text-muted-foreground">Your material · add to it or correct it.</p>
      </PageHeader>
      <MaterialEditor
        topicId={id}
        initialText={topic.source_text}
        hasLesson={topic.lesson_chunks.length > 0}
        historyCounts={{
          dumps: topic.dumps.length,
          answers: topic.recall_questions.reduce((n, q) => n + q.attempts.length, 0),
        }}
      />
    </main>
  );
}
