import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Wind } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getBelief } from "@/lib/beliefs";
import { localDate } from "@/lib/schedule";
import { formatDay } from "@/lib/schemas";
import { BeliefEditor } from "../belief-editor";
import { BeliefStatusActions, DeleteBelief } from "./belief-status";

// One belief: the guided reframe to keep working on, and letting it go.
export default async function BeliefPage({ params }: PageProps<"/growth/beliefs/[id]">) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const belief = await getBelief(id);
  if (!belief) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader
        title={belief.status === "let_go" ? "A belief you let go" : "A belief you're working on"}
        description={`Written down ${formatDay(localDate(new Date(belief.createdAt)))}.`}
        back={{ href: "/growth/beliefs", label: "Limiting beliefs" }}
      />
      {belief.status === "let_go" && belief.letGoAt && (
        <p className="flex items-center gap-2 rounded-xl bg-success-soft/60 p-3 text-sm text-success-foreground">
          <Wind className="size-4 shrink-0" /> Let go on {formatDay(localDate(new Date(belief.letGoAt)))}.
        </p>
      )}
      <BeliefEditor
        beliefId={belief.id}
        initial={{
          belief: belief.belief,
          origin: belief.origin ?? "",
          evidenceAgainst: belief.evidenceAgainst ?? "",
          reframe: belief.reframe ?? "",
          strengthStart: belief.strengthStart,
          strengthNow: belief.strengthNow,
        }}
      />
      <BeliefStatusActions beliefId={belief.id} status={belief.status} />
      <div className="border-t pt-6">
        <DeleteBelief beliefId={belief.id} />
      </div>
    </main>
  );
}
