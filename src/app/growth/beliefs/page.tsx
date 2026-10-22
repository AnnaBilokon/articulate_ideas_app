import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, Feather, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listBeliefs, type Belief } from "@/lib/beliefs";
import { cn } from "@/lib/utils";

// Limiting beliefs: the ones being worked on, then the ones let go.
export default async function BeliefsPage() {
  await connection();
  const beliefs = await listBeliefs();
  const working = beliefs.filter((b) => b.status === "working_on");
  const letGo = beliefs.filter((b) => b.status === "let_go");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title="Limiting beliefs" description="Thoughts that hold you back, and kinder, truer ones to replace them.">
        <Link href="/growth/beliefs/new" className={cn(buttonVariants(), "w-fit")}>
          <Plus className="size-4" /> New belief
        </Link>
      </PageHeader>

      {beliefs.length === 0 && (
        <Card className="bg-muted/40">
          <CardContent className="flex flex-col items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-highlight text-highlight-foreground">
              <Feather className="size-5" />
            </span>
            <p className="text-sm text-muted-foreground">
              Write down one thing you tell yourself that keeps you small. You&apos;ll look at where it comes from, what
              says otherwise, and find a kinder way to put it. Only you see this.
            </p>
          </CardContent>
        </Card>
      )}

      {working.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-heading">Working on</h2>
          <ul className="flex flex-col gap-2">
            {working.map((b) => (
              <li key={b.id}>
                <BeliefRow belief={b} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {letGo.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-heading">Let go</h2>
          <ul className="flex flex-col gap-2">
            {letGo.map((b) => (
              <li key={b.id}>
                <BeliefRow belief={b} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function BeliefRow({ belief: b }: { belief: Belief }) {
  const change = b.strengthStart !== null && b.strengthNow !== null && b.strengthNow !== b.strengthStart;
  return (
    <Link
      href={`/growth/beliefs/${b.id}`}
      className={cn(
        "group flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-accent/50",
        b.status === "let_go" && "bg-muted/40",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-sm text-muted-foreground line-through decoration-muted-foreground/40">{b.belief}</span>
        {b.reframe ? (
          <span className="font-medium">{b.reframe}</span>
        ) : (
          <span className="text-sm text-muted-foreground italic">No new belief yet</span>
        )}
        {change && (
          <span className="text-xs text-muted-foreground">
            Felt {b.strengthStart}/10 true, now {b.strengthNow}/10
          </span>
        )}
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
