import { PageHeader } from "@/components/page-header";
import { BeliefEditor } from "../belief-editor";

export default function NewBeliefPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader
        title="A limiting belief"
        description="Take it one step at a time. Only the belief is needed to start; come back to the rest."
        back={{ href: "/growth/beliefs", label: "Limiting beliefs" }}
      />
      <BeliefEditor />
    </main>
  );
}
