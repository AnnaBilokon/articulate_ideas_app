import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, Tags } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { loadMoney } from "@/lib/money";
import { formatKr, monthSlug, nextMonth, periodLabel, periodTotals } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { NoMonths } from "../money-bits";
import { StartMonth } from "../start-month";

// Every pay period, newest first, and starting the next one.
export default async function MonthsPage() {
  await connection();
  const { categories, periods } = await loadMoney();
  const latest = periods.at(-1);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title="Months" description="One pay period each, from one payday to the next.">
        <div className="flex flex-wrap items-center gap-3">
          {latest && <StartMonth label={`Start ${periodLabel(nextMonth(latest.month))}`} />}
          <Link href="/money/categories" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <Tags className="size-4" /> Categories
          </Link>
        </div>
      </PageHeader>

      {periods.length === 0 ? (
        <NoMonths />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...periods].reverse().map((p) => {
            const t = periodTotals(p, categories);
            return (
              <li key={p.id}>
                <Link
                  href={`/money/months/${monthSlug(p.month)}`}
                  className={cn(
                    "group flex h-full flex-col gap-3 rounded-xl p-4 ring-1 ring-foreground/10 transition-colors hover:ring-primary/40",
                    t.billsEntered ? "bg-card" : "money-hero",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-heading">{periodLabel(p.month)}</span>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </span>
                  {t.billsEntered ? (
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                      {(
                        [
                          ["In", t.income],
                          ["Spent", t.spending],
                          ["Saved", t.saved],
                          ["Free", t.freeCash],
                        ] as const
                      ).map(([label, value]) => (
                        <div key={label} className="flex flex-col">
                          <dt className="text-xs text-muted-foreground">{label}</dt>
                          <dd className="font-medium tabular-nums">{formatKr(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {t.started ? "In progress: the bills aren't in yet." : "Expected amounts only. Fill it in after payday."}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
