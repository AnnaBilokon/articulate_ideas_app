import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { getExploration } from "@/lib/explore";
import { ExploreChat } from "./explore-chat";

// One Explore chat: continue it, save it to your knowledge, pick review questions.
export default async function ExplorePage({ params }: PageProps<"/explore/[id]">) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const exploration = await getExploration(id);
  if (!exploration) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader title={exploration.title} description={exploration.question} back={{ href: "/learn", label: "Today" }} />
      <ExploreChat initial={exploration} />
    </main>
  );
}
