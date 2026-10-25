import Link from "next/link";
import { connection } from "next/server";
import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadMoney } from "@/lib/money";
import { cellStyle, formatKr, monthSlug, periodLabel, periodShort, periodTotals, runningBalances } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { ColorKey, MonthPicker, NoMonths, StatTile, colorsUsed, pickPeriod, previousOf } from "./money-bits";

// This month at a glance: a band with income, spending, savings and free
// cash, then two columns: expected vs actual per bill on the left, where
// savings and pots stand on the right.
export default async function MoneyOverview({ searchParams }: PageProps<"/money">) {
  await connection();
  const { month } = await searchParams;
  const { categories, periods, colorLabels } = await loadMoney();
  const period = pickPeriod(periods, month);

  if (!period) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
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
  // Until the bills are in, show what's expected; income as soon as it's entered.
  const expected = !totals.billsEntered;
  // Savings that move money but don't count as saved, like investments.
  const otherSavings = categories
    .filter((c) => c.kind === "saving" && !c.countsAsSaved && (entry.get(c.id)?.amount ?? 0) !== 0)
    .map((c) => c.name)
    .join(", ");
  const income = totals.income > 0 ? totals.income : totals.plannedIncome;
  const expectedFree = income - totals.plannedExpenses - totals.plannedPotTransfers - totals.plannedSavingTransfers;

  const expenses = of("expense")
    .map((c) => ({ c, e: entry.get(c.id) }))
    .filter(({ e }) => e && (e.amount !== null || e.planned !== null));
  const scale = Math.max(1, ...expenses.map(({ e }) => Math.max(e?.amount ?? 0, e?.planned ?? 0)));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="money-hero flex flex-col gap-5 rounded-2xl p-4 ring-1 ring-foreground/10 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <PageHeader
            title={periodLabel(period.month)}
            description={
              !expected
                ? "Income, spending and savings this pay period."
                : totals.income > 0
                  ? "In progress: income is in; the rest shows what you expect."
                  : "Not filled in yet: these are the expected amounts."
            }
          />
          <Link
            href={`/money/months/${monthSlug(period.month)}`}
            className={cn(buttonVariants({ variant: expected ? "default" : "outline" }), "w-fit", !expected && "bg-card/80")}
          >
            <Pencil className="size-4" /> {expected ? "Fill in this month" : "Edit this month"}
          </Link>
        </div>

        <MonthPicker periods={periods} current={period.month} base="/money" />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="group" aria-label="This month">
          <StatTile
            label={expected && totals.income === 0 ? "Income, expected" : "Income"}
            value={expected ? income : totals.income}
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
            value={expected ? totals.plannedSaved : totals.saved}
            previous={!expected && prev ? { value: prev.totals.saved, label: prev.label } : null}
            upIsGood
            hint={[
              !expected && totals.savingsRate !== null ? `${Math.round(totals.savingsRate * 100)}% of income` : null,
              !expected && totals.otherSavingTransfers !== 0 ? `also ${formatKr(totals.otherSavingTransfers)} to ${otherSavings}` : null,
            ]
              .filter(Boolean)
              .join(", ")}
          />
          <StatTile
            label={expected ? "Free cash, expected" : "Free cash"}
            value={expected ? expectedFree : totals.freeCash}
            previous={!expected && prev ? { value: prev.totals.freeCash, label: prev.label } : null}
            upIsGood
            hint="Left after bills, pots and savings"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <div className="flex flex-col gap-6">
          {expenses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-heading">Bills and spending</CardTitle>
                <p className="text-sm text-muted-foreground">Actual against expected. The line marks what you expected.</p>
                <ColorKey used={colorsUsed([period])} labels={colorLabels} />
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
                            {actual !== null ? (
                              <span
                                className={cn(e?.colors.amount && "rounded px-1.5 py-0.5")}
                                style={cellStyle(e?.colors.amount)}
                                title={e?.colors.amount ? colorLabels[e.colors.amount] : undefined}
                              >
                                {formatKr(actual)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">–</span>
                            )}
                            {planned !== null && <span className="text-xs text-muted-foreground"> / {formatKr(planned)}</span>}
                          </span>
                        </div>
                        <div className="relative h-2 rounded-full bg-muted" aria-hidden>
                          {actual !== null && actual > 0 && (
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${(Math.min(actual, scale) / scale) * 100}%`, background: "var(--series-1)" }}
                            />
                          )}
                          {planned !== null && planned > 0 && (
                            <div
                              className="absolute -top-0.5 h-3 w-0.5 rounded-full bg-foreground/70"
                              style={{ left: `calc(${(planned / scale) * 100}% - 1px)` }}
                            />
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
                      <span
                        className={cn("tabular-nums", o.color && "rounded px-1.5 py-0.5")}
                        style={cellStyle(o.color)}
                        title={o.color ? colorLabels[o.color] : undefined}
                      >
                        {formatKr(o.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {(["saving", "pot"] as const).map((kind) => {
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
                      const balance = balances.get(c.id) ?? 0;
                      const share = c.target ? Math.min(1, balance / c.target) : null;
                      return (
                        <li key={c.id} className="flex flex-col gap-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate">
                                {c.name}
                                {kind === "saving" && !c.countsAsSaved && <span className="ml-1.5 text-xs text-muted-foreground">not counted as saved</span>}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {e?.amount != null ? `+${formatKr(e.amount)}` : e?.planned != null ? `${formatKr(e.planned)} expected` : "Nothing in"}
                                {kind === "pot" && e?.spent != null && e.spent !== 0 && ` · ${formatKr(e.spent)} spent`}
                              </span>
                            </span>
                            <span className="shrink-0 font-medium tabular-nums">{formatKr(balance)}</span>
                          </div>
                          {share !== null && c.target && (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                                <div
                                  className={share >= 1 ? "h-full rounded-full bg-success" : "h-full rounded-full bg-primary"}
                                  style={{ width: `${Math.max(share > 0 ? 3 : 0, share * 100)}%` }}
                                />
                              </div>
                              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                {share >= 1 ? "Goal reached" : `${Math.round(share * 100)}% of ${formatKr(c.target)}`}
                              </span>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}
