import { connection } from "next/server";
import { ColumnChart } from "@/components/charts/column-chart";
import { LineChart } from "@/components/charts/line-chart";
import { seriesColor } from "@/components/charts/series";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadMoney } from "@/lib/money";
import { formatKr, periodShort, periodTotals, runningBalances } from "@/lib/schemas";
import { NoMonths, StatTile } from "../money-bits";

// Savings growth and pots: balances over time, the savings rate per month,
// and what's in each pot now.
export default async function SavingsPage() {
  await connection();
  const { categories, periods } = await loadMoney();
  const filled = periods.filter((p) => periodTotals(p, categories).started);

  if (filled.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
        <PageHeader title="Savings and pots" description="What you've put aside, and how it grows." />
        {periods.length === 0 ? <NoMonths /> : <p className="text-muted-foreground">Fill in a month to see your savings here.</p>}
      </main>
    );
  }

  const balances = runningBalances(periods, categories);
  const labels = filled.map((p) => periodShort(p.month));
  const balanceSeries = (kind: "pot" | "saving") =>
    categories
      .filter((c) => c.kind === kind && filled.some((p) => balances.get(p.id)?.has(c.id)))
      .map((c, i) => ({
        key: c.id,
        name: c.name,
        color: seriesColor(i),
        values: filled.map((p) => balances.get(p.id)?.get(c.id) ?? null),
      }));
  const savings = balanceSeries("saving");
  const pots = balanceSeries("pot");
  const latest = filled[filled.length - 1];
  const before = filled.length > 1 ? filled[filled.length - 2] : null;
  const totalOf = (p: typeof latest, kind: "pot" | "saving") =>
    categories.filter((c) => c.kind === kind).reduce((t, c) => t + (balances.get(p.id)?.get(c.id) ?? 0), 0);
  const rates = filled.map((p) => periodTotals(p, categories).savingsRate);
  const known = rates.filter((r): r is number => r !== null);
  const emergency = savings.find((s) => /emergency/i.test(s.name));
  const potsNow = pots
    .map((s) => ({ name: s.name, value: s.values[s.values.length - 1] ?? 0 }))
    .sort((a, b) => b.value - a.value);
  const potMax = Math.max(1, ...potsNow.map((p) => Math.abs(p.value)));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader title="Savings and pots" description={`Balances at the end of each month, up to ${periodShort(latest.month)}.`} />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="All savings"
          value={totalOf(latest, "saving")}
          previous={before ? { value: totalOf(before, "saving"), label: periodShort(before.month) } : null}
          upIsGood
        />
        {emergency && (
          <StatTile
            label={emergency.name}
            value={emergency.values[emergency.values.length - 1] ?? 0}
            previous={before && emergency.values.length > 1 ? { value: emergency.values[emergency.values.length - 2] ?? 0, label: periodShort(before.month) } : null}
            upIsGood
          />
        )}
        <StatTile label="In pots" value={totalOf(latest, "pot")} upIsGood hint="Set aside to spend" />
        <Card size="sm">
          <CardContent className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Savings rate</span>
            <span className="text-xl font-semibold text-heading sm:text-2xl">
              {known.length ? `${Math.round((known.reduce((a, b) => a + b, 0) / known.length) * 100)}%` : "–"}
            </span>
            <span className="text-xs text-muted-foreground">Average share of income saved</span>
          </CardContent>
        </Card>
      </section>

      {savings.length > 0 && (
        <LineChart title="Savings over time" description="Each account's balance at the end of the month." data={{ labels, series: savings }} />
      )}

      <ColumnChart
        title="Savings rate"
        description="Share of each month's income that went to savings."
        unit="percent"
        data={{ labels, series: [{ key: "rate", name: "Savings rate", color: seriesColor(0), values: rates }] }}
      />

      {potsNow.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-heading">In your pots now</CardTitle>
            <p className="text-sm text-muted-foreground">What&apos;s left in each, at the end of {periodShort(latest.month)}.</p>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {potsNow.map((p) => (
                <li key={p.name} className="flex flex-col gap-1">
                  <div className="flex justify-between gap-3 text-sm">
                    <span>{p.name}</span>
                    <span className="tabular-nums">{formatKr(p.value)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted" aria-hidden>
                    {p.value > 0 && <div className="h-full rounded-full" style={{ width: `${(p.value / potMax) * 100}%`, background: "var(--series-1)" }} />}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {pots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-heading">Pots, month by month</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="py-1.5 pr-3 text-left font-medium">Pot</th>
                  {labels.map((l) => (
                    <th key={l} className="px-2 py-1.5 text-right font-medium whitespace-nowrap">
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {pots.map((s) => (
                  <tr key={s.key} className="border-t border-border/60">
                    <td className="py-1.5 pr-3 whitespace-nowrap">{s.name}</td>
                    {s.values.map((v, i) => (
                      <td key={labels[i]} className="px-2 py-1.5 text-right whitespace-nowrap">
                        {v === null ? "–" : formatKr(v).replace(" kr", "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">What was left at the end of each month, in kr.</p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
