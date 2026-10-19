import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { favoriteAreas } from "@/lib/discover";
import { areaSchema } from "@/lib/schemas";
import { DiscoverView } from "./discover-view";

export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  await connection(); // Fresh on every visit: the areas can change.
  const { area } = await searchParams;
  const initialArea = areaSchema.safeParse(area);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader
        title="Discover"
        description="Pick one of your favourite areas, and get ideas for what to learn next that build on what you already know."
        back={{ href: "/", label: "Today" }}
      />
      <DiscoverView areas={await favoriteAreas()} initialArea={initialArea.success ? initialArea.data : null} />
    </main>
  );
}
