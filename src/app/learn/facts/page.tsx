import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { favoriteAreas } from "@/lib/discover";
import { QuickFacts } from "./quick-facts";

// For days with little time or energy: one short, interesting fact at a time,
// so learning still happens.
export default async function QuickFactsPage() {
  await connection(); // Favourite areas can change.
  const areas = await favoriteAreas();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader
        title="Quick facts"
        description="Short on time or energy? Pick a topic, then a question, and learn one interesting thing in a minute."
      />
      <QuickFacts areas={areas} />
    </main>
  );
}
