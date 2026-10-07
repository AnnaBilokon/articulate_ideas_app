import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/supabase";
import { practiceOverview } from "@/lib/vocabulary";
import { VocabularyBook } from "./vocabulary-book";

export default async function VocabularyPage() {
  await connection(); // Fresh on every visit: words and due dates change.
  const [{ data: words }, practice] = await Promise.all([
    db()
      .from("vocabulary_words")
      .select(
        "id, word, part_of_speech, definition, usage_note, examples, translation, context, due_at, last_score, created_at, topics(id, title)",
      )
      .order("created_at", { ascending: false }),
    practiceOverview(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader
        title="Vocabulary"
        description="Words you want to remember: save them from a lesson, or add your own. Then practice them."
      />
      <VocabularyBook words={words ?? []} due={practice.due} nextDueAt={practice.nextDueAt} />
    </main>
  );
}
