import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { favoriteAreas } from "@/lib/discover";
import { savedQuestions } from "@/lib/saved-questions";
import { areaSchema } from "@/lib/schemas";
import { DiscoverView } from "./discover-view";

export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  await connection(); // Fresh on every visit: the areas can change.
  const { area } = await searchParams;
  const initialArea = areaSchema.safeParse(area);
  const [areas, ideas] = await Promise.all([favoriteAreas(), savedQuestions()]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader
        title="Discover"
        description="Where your next topic comes from: your own ideas, and suggestions that build on what you already know."
        back={{ href: "/learn", label: "Today" }}
      />
      <DiscoverView
        areas={areas}
        ideas={ideas.filter((q) => !q.startedAt)}
        initialArea={initialArea.success ? initialArea.data : null}
      />
    </main>
  );
}
