import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { TermQuiz } from "@/components/term-quiz";
import { db } from "@/lib/supabase";
import { shuffle } from "@/lib/utils";

const TERMS_PER_ROUND = 10;

// Term practice mixed across every topic: a fresh random set each visit.
export default async function TermPracticePage() {
  await connection();
  const { data } = await db().from("glossary_terms").select("id, definition, topics(title)");
  const terms = shuffle(data ?? [])
    .slice(0, TERMS_PER_ROUND)
    .map((t) => ({ id: t.id, definition: t.definition, topicTitle: t.topics?.title }));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader
        title="Term practice"
        description={`${terms.length} terms from your topics. Read the explanation and name the term. Practice only: nothing is scheduled.`}
        back={{ href: "/", label: "Today" }}
      />
      {terms.length > 0 ? (
        <TermQuiz terms={terms} backHref="/" backLabel="Back to Today" />
      ) : (
        <p className="text-muted-foreground">No terms yet. Each topic&apos;s glossary terms appear after its lesson.</p>
      )}
    </main>
  );
}
