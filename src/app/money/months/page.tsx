import Link from "next/link";
import { connection } from "next/server";
import { ChevronRight, Tags } from "lucide-react";
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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
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
        <ul className="flex flex-col gap-2">
          {[...periods].reverse().map((p) => {
            const t = periodTotals(p, categories);
            return (
              <li key={p.id}>
                <Link
                  href={`/money/months/${monthSlug(p.month)}`}
                  className="group flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-accent/50"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-medium">{periodLabel(p.month)}</span>
                    {t.started ? (
                      <span className="flex flex-wrap gap-x-3 text-xs text-muted-foreground tabular-nums">
                        <span>In {formatKr(t.income)}</span>
                        <span>Spent {formatKr(t.spending)}</span>
                        <span>Saved {formatKr(t.savingTransfers)}</span>
                        <span className={cn(t.freeCash < 0 && "text-foreground")}>Free {formatKr(t.freeCash)}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Expected amounts only · fill it in</span>
                    )}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
