import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { challengeInfo, challengeKinds, challengeView, type ChallengeKind } from "@/lib/schemas";
import { db } from "@/lib/supabase";
import { SpotMistakePlay } from "./spot-mistake-play";
import { TwoTruthsPlay } from "./two-truths-play";

// Plays one challenge. Only the public view is sent; the answer key comes
// back from the server after the attempt.
export default async function ChallengePage({ params }: PageProps<"/challenges/[id]">) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: challenge } = await db()
    .from("challenges")
    .select("kind, content, topic_id, topics(title)")
    .eq("id", id)
    .maybeSingle();
  if (!challenge || !challengeKinds.includes(challenge.kind as ChallengeKind)) notFound();
  const kind = challenge.kind as ChallengeKind;
  const view = challengeView(kind, challenge.content);
  if (!view) notFound();
  const back = { href: `/topics/${challenge.topic_id}/challenges`, label: `${challenge.topics?.title ?? "Topic"}: challenges` };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader title={challengeInfo[kind].name} description={challengeInfo[kind].blurb} back={back} />
      {view.kind === "spot_mistake" ? (
        <SpotMistakePlay challengeId={id} topicId={challenge.topic_id} sentences={view.sentences} />
      ) : (
        <TwoTruthsPlay challengeId={id} topicId={challenge.topic_id} rounds={view.rounds} />
      )}
    </main>
  );
}
