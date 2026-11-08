import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { listFacts } from "@/lib/facts";
import { savedQuestionsToLearn } from "@/lib/saved-questions";
import { LibraryTabs } from "../library-tabs";
import { FactsList } from "./facts-list";

export default async function LibraryFactsPage() {
  await connection(); // New facts are read all the time.
  const [facts, savedCount] = await Promise.all([listFacts(), savedQuestionsToLearn()]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title="Library" description="Everything you've studied: how well you know it, and when it comes back." />
      <LibraryTabs current="facts" savedCount={savedCount} />
      <FactsList facts={facts} />
    </main>
  );
}
