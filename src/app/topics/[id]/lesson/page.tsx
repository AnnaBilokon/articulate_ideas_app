import { notFound, redirect } from "next/navigation";
import { BookA } from "lucide-react";
import { BackgroundBuilder } from "@/components/background-builder";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/supabase";
import { LessonReader } from "./lesson-reader";

export default async function LessonPage({ params }: PageProps<"/topics/[id]/lesson">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: topic } = await db()
    .from("topics")
    .select(
      "title, researched_at, lesson_chunks(id, title, content, position), glossary_terms(term, full_form, definition, example)",
    )
    .eq("id", id)
    .order("position", { referencedTable: "lesson_chunks" })
    .maybeSingle();
  if (!topic) notFound();
  if (topic.lesson_chunks.length === 0) redirect(`/topics/${id}`);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title={topic.title} back={{ href: `/topics/${id}`, label: "Topic" }}>
        {topic.glossary_terms.length === 0 && (
          // Older topics have no glossary yet; new ones get it in the background.
          <BackgroundBuilder
            endpoint={`/api/topics/${id}/glossary`}
            startedAt={topic.researched_at}
            waitingText="Building the glossary for this lesson…"
            buttonText="Create glossary: explain hard words as I read"
            icon={<BookA className="size-4" />}
          />
        )}
      </PageHeader>
      <LessonReader
        topicId={id}
        chunks={topic.lesson_chunks.map(({ id: chunkId, title, content }) => ({ id: chunkId, title, content }))}
        terms={topic.glossary_terms}
      />
    </main>
  );
}
