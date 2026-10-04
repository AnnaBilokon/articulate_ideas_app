import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/supabase";
import { QuizSession } from "./quiz-session";

export default async function QuizPage({ params }: PageProps<"/topics/[id]/quiz">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  // Key points are not loaded here: the answer key stays on the server until
  // an answer has been graded.
  const { data: topic } = await db()
    .from("topics")
    .select("title, dumps(id), recall_questions(id, text, type, position)")
    .eq("id", id)
    .order("position", { referencedTable: "recall_questions" })
    .maybeSingle();
  if (!topic) notFound();
  if (topic.dumps.length === 0) redirect(`/topics/${id}/dump`);
  if (topic.recall_questions.length === 0) redirect(`/topics/${id}`);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title={topic.title} back={{ href: `/topics/${id}`, label: "Topic" }}>
        <p className="text-sm text-muted-foreground">
          Quiz · say how sure you are, answer from memory, then see how you did.
        </p>
      </PageHeader>
      <QuizSession topicId={id} questions={topic.recall_questions.map(({ id: qid, text }) => ({ id: qid, text }))} />
    </main>
  );
}
