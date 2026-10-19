import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { savedQuestions } from "@/lib/saved-questions";
import { LibraryTabs } from "../library-tabs";
import { SavedQuestionsList } from "./saved-questions-list";

export default async function SavedQuestionsPage() {
  await connection(); // Fresh on every visit: questions get saved and started.
  const questions = await savedQuestions();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader
        title="Library"
        description="Everything you've studied: how well you know it, and when it comes back."
      />
      <LibraryTabs current="questions" savedCount={questions.filter((q) => !q.startedAt).length} />
      <SavedQuestionsList questions={questions} />
    </main>
  );
}
