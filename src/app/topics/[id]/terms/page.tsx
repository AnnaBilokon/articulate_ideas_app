import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { TermQuiz } from "@/components/term-quiz";
import { db } from "@/lib/supabase";
import { shuffle } from "@/lib/utils";

// One topic's glossary terms as a quiz: read the explanation, name the term.
export default async function TopicTermQuizPage({ params }: PageProps<"/topics/[id]/terms">) {
  await connection(); // A fresh order on every visit.
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: topic } = await db()
    .from("topics")
    .select("title, glossary_terms(id, definition)")
    .eq("id", id)
    .maybeSingle();
  if (!topic) notFound();
  const back = { href: `/topics/${id}`, label: topic.title };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader
        title="Term quiz"
        description="Read the explanation and name the term in a word or two. Practice only: nothing is scheduled."
        back={back}
      />
      {topic.glossary_terms.length > 0 ? (
        <TermQuiz terms={shuffle(topic.glossary_terms)} backHref={back.href} backLabel="Back to the topic" />
      ) : (
        <p className="text-muted-foreground">This topic has no glossary terms yet. They appear after the lesson.</p>
      )}
    </main>
  );
}
