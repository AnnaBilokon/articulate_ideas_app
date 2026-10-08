import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { MAX_QUIZ_QUESTIONS } from "@/lib/schemas";
import { db } from "@/lib/supabase";
import { QuizSession } from "./quiz-session";

// At most MAX_QUIZ_QUESTIONS, questions never answered first, so "Quiz again"
// on a topic with more questions gets to the rest. Shown in lesson order.
function quizQuestions(questions: { id: string; text: string; position: number; attempts: { id: string }[] }[]) {
  const fresh = questions.filter((q) => q.attempts.length === 0);
  const answered = questions.filter((q) => q.attempts.length > 0);
  return [...fresh, ...answered]
    .slice(0, MAX_QUIZ_QUESTIONS)
    .sort((a, b) => a.position - b.position)
    .map(({ id, text }) => ({ id, text }));
}

export default async function QuizPage({ params }: PageProps<"/topics/[id]/quiz">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  // Key points are not loaded here: the answer key stays on the server until
  // an answer has been graded.
  const { data: topic } = await db()
    .from("topics")
    .select("title, dumps(id), recall_questions(id, text, type, position, attempts(id))")
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
      <QuizSession topicId={id} questions={quizQuestions(topic.recall_questions)} />
    </main>
  );
}
