import Link from "next/link";
import { connection } from "next/server";
import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadMoney } from "@/lib/money";
import { formatKr, monthSlug, periodLabel, periodShort, periodTotals, runningBalances } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { MonthPicker, NoMonths, StatTile, pickPeriod, previousOf } from "./money-bits";

// This month at a glance: income, spending, savings and free cash, then
// expected vs actual per bill, and where the pots and savings stand.
export default async function MoneyOverview({ searchParams }: PageProps<"/money">) {
  await connection();
  const { month } = await searchParams;
  const { categories, periods } = await loadMoney();
  const period = pickPeriod(periods, month);

  if (!period) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
        <PageHeader title="Money" description="Income, spending and savings, one pay period at a time." />
        <NoMonths />
      </main>
    );
  }

  const totals = periodTotals(period, categories);
  const before = previousOf(periods, period);
  const prev = before ? { totals: periodTotals(before, categories), label: periodShort(before.month) } : null;
  const balances = runningBalances(periods, categories).get(period.id) ?? new Map<string, number>();
  const entry = new Map(period.entries.map((e) => [e.categoryId, e]));
  const of = (kind: string) => categories.filter((c) => c.kind === kind && (entry.has(c.id) || balances.has(c.id)));
  const expected = !totals.started;

  const expenses = of("expense")
    .map((c) => ({ c, e: entry.get(c.id) }))
    .filter(({ e }) => e && (e.amount !== null || e.planned !== null));
  const scale = Math.max(1, ...expenses.map(({ e }) => Math.max(e?.amount ?? 0, e?.planned ?? 0)));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title={periodLabel(period.month)} description={expected ? "Not filled in yet: these are the expected amounts." : "Income, spending and savings this pay period."}>
        <Link href={`/money/months/${monthSlug(period.month)}`} className={cn(buttonVariants({ variant: expected ? "default" : "outline" }), "w-fit")}>
          <Pencil className="size-4" /> {expected ? "Fill in this month" : "Edit this month"}
        </Link>
      </PageHeader>

      <MonthPicker periods={periods} current={period.month} base="/money" />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="This month">
        <StatTile
          label={expected ? "Income, expected" : "Income"}
          value={expected ? totals.plannedIncome : totals.income}
          previous={!expected && prev ? { value: prev.totals.income, label: prev.label } : null}
          upIsGood
        />
        <StatTile
          label={expected ? "Bills, expected" : "Spent"}
          value={expected ? totals.plannedExpenses : totals.spending}
          previous={!expected && prev ? { value: prev.totals.spending, label: prev.label } : null}
          upIsGood={false}
          hint={expected ? undefined : "Bills, one-offs and spending from pots"}
        />
        <StatTile
          label={expected ? "To save" : "Saved"}
          value={expected ? totals.plannedSavingTransfers : totals.savingTransfers}
          previous={!expected && prev ? { value: prev.totals.savingTransfers, label: prev.label } : null}
          upIsGood
          hint={!expected && totals.savingsRate !== null ? `${Math.round(totals.savingsRate * 100)}% of income` : undefined}
        />
        <StatTile
          label={expected ? "Free cash, expected" : "Free cash"}
          value={expected ? totals.plannedFreeCash : totals.freeCash}
          previous={!expected && prev ? { value: prev.totals.freeCash, label: prev.label } : null}
          upIsGood
          hint="Left after bills, pots and savings"
        />
      </section>

      {expenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-heading">Bills and spending</CardTitle>
            <p className="text-sm text-muted-foreground">Actual against expected. The line marks what you expected.</p>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {expenses.map(({ c, e }) => {
                const actual = e?.amount ?? null;
                const planned = e?.planned ?? null;
                const over = actual !== null && planned !== null ? actual - planned : 0;
                return (
                  <li key={c.id} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">
                        {c.name}
                        {e?.note && <span className="ml-1.5 text-xs text-muted-foreground">{e.note}</span>}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {actual !== null ? formatKr(actual) : <span className="text-muted-foreground">–</span>}
                        {planned !== null && <span className="text-xs text-muted-foreground"> / {formatKr(planned)}</span>}
                      </span>
                    </div>
                    <div className="relative h-2 rounded-full bg-muted" aria-hidden>
                      {actual !== null && actual > 0 && (
                        <div className="h-full rounded-full" style={{ width: `${(Math.min(actual, scale) / scale) * 100}%`, background: "var(--series-1)" }} />
                      )}
                      {planned !== null && planned > 0 && (
                        <div className="absolute -top-0.5 h-3 w-0.5 rounded-full bg-foreground/70" style={{ left: `calc(${(planned / scale) * 100}% - 1px)` }} />
                      )}
                    </div>
                    {over > 0 && <span className="text-xs text-muted-foreground">{formatKr(over)} more than expected</span>}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {period.oneOffs.length > 0 && (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-heading">One-offs</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1.5 text-sm">
              {period.oneOffs.map((o) => (
                <li key={o.id} className="flex justify-between gap-3">
                  <span>{o.title}</span>
                  <span className="tabular-nums">{formatKr(o.amount)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {(["pot", "saving"] as const).map((kind) => {
          const list = of(kind);
          if (list.length === 0) return null;
          return (
            <Card key={kind} size="sm">
              <CardHeader>
                <CardTitle className="text-heading">{kind === "pot" ? "Pots" : "Savings"}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2 text-sm">
                  {list.map((c) => {
                    const e = entry.get(c.id);
                    return (
                      <li key={c.id} className="flex items-baseline justify-between gap-3">
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">{c.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {e?.amount != null ? `+${formatKr(e.amount)}` : e?.planned != null ? `${formatKr(e.planned)} expected` : "Nothing in"}
                            {kind === "pot" && e?.spent != null && e.spent !== 0 && ` · ${formatKr(e.spent)} spent`}
                          </span>
                        </span>
                        <span className="shrink-0 font-medium tabular-nums">{formatKr(balances.get(c.id) ?? 0)}</span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
