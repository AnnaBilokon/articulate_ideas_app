import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { listExplorations } from "@/lib/explore";
import { savedQuestionsToLearn } from "@/lib/saved-questions";
import { LibraryTabs } from "../library-tabs";
import { ChatsList } from "./chats-list";

export default async function LibraryExplorePage() {
  await connection(); // Chats change with every message.
  const [chats, savedCount] = await Promise.all([listExplorations(), savedQuestionsToLearn()]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title="Library" description="Everything you've studied: how well you know it, and when it comes back." />
      <LibraryTabs current="explore" savedCount={savedCount} />
      <ChatsList chats={chats} />
    </main>
  );
}
