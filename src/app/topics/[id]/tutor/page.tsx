import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { parseTutorMessages } from "@/lib/schemas";
import { db } from "@/lib/supabase";
import { TutorChat } from "./tutor-chat";

// The Socratic tutor for one topic: the conversation in progress, or the
// latest one, with a way to start a new one.
export default async function TutorPage({ params }: PageProps<"/topics/[id]/tutor">) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: topic } = await db()
    .from("topics")
    .select("title, lesson_chunks(id), tutor_sessions(id, messages, done, summary, updated_at)")
    .eq("id", id)
    .order("updated_at", { referencedTable: "tutor_sessions", ascending: false })
    .maybeSingle();
  if (!topic) notFound();
  const latest = topic.tutor_sessions[0];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader
        title="Talk it through"
        description="A tutor asks you questions, one at a time, and you work the ideas out. Stuck? Ask for a hint."
        back={{ href: `/topics/${id}`, label: topic.title }}
      />
      {topic.lesson_chunks.length === 0 ? (
        <p className="text-muted-foreground">Read the lesson first: the tutor builds on it.</p>
      ) : (
        <TutorChat
          topicId={id}
          initial={
            latest
              ? { id: latest.id, messages: parseTutorMessages(latest.messages), done: latest.done, summary: latest.summary }
              : null
          }
          finishedBefore={topic.tutor_sessions.filter((s) => s.done).length}
        />
      )}
    </main>
  );
}
