import Link from "next/link";
import { connection } from "next/server";
import { Target } from "lucide-react";
import { ColumnChart } from "@/components/charts/column-chart";
import { LineChart } from "@/components/charts/line-chart";
import { seriesColor } from "@/components/charts/series";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadMoney } from "@/lib/money";
import { cellStyle, formatKr, periodShort, periodTotals, runningBalances, type MoneyColor } from "@/lib/schemas";
import { ColorKey, NoMonths, StatTile } from "../money-bits";

// Savings growth and pots: your savings and their goals, investments and
// other savings apart from them, the savings rate per month, and what's in
// each pot now.
export default async function SavingsPage() {
  await connection();
  const { categories, periods, colorLabels } = await loadMoney();
  const filled = periods.filter((p) => periodTotals(p, categories).billsEntered);

  if (filled.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
        <PageHeader title="Savings and pots" description="What you've put aside, and how it grows." />
        {periods.length === 0 ? <NoMonths /> : <p className="text-muted-foreground">Fill in a month to see your savings here.</p>}
      </main>
    );
  }

  const balances = runningBalances(periods, categories);
  const labels = filled.map((p) => periodShort(p.month));
  const balanceSeries = (keep: (c: (typeof categories)[number]) => boolean) =>
    categories
      .filter((c) => keep(c) && filled.some((p) => balances.get(p.id)?.has(c.id)))
      .map((c, i) => ({
        key: c.id,
        name: c.name,
        color: seriesColor(i),
        values: filled.map((p) => balances.get(p.id)?.get(c.id) ?? null),
      }));
  // What's really saved, and investments and other savings apart from it.
  const saved = balanceSeries((c) => c.kind === "saving" && c.countsAsSaved);
  const others = balanceSeries((c) => c.kind === "saving" && !c.countsAsSaved);
  const pots = balanceSeries((c) => c.kind === "pot");
  const latest = filled[filled.length - 1];
  const before = filled.length > 1 ? filled[filled.length - 2] : null;
  const totalOf = (p: typeof latest, keep: (c: (typeof categories)[number]) => boolean) =>
    categories.filter(keep).reduce((t, c) => t + (balances.get(p.id)?.get(c.id) ?? 0), 0);
  const isSaved = (c: (typeof categories)[number]) => c.kind === "saving" && c.countsAsSaved;
  const isOther = (c: (typeof categories)[number]) => c.kind === "saving" && !c.countsAsSaved;
  const isPot = (c: (typeof categories)[number]) => c.kind === "pot";

  // Goals: the balance now, what's left, and how long at the recent pace:
  // how much the balance grew a month over the last three filled-in months,
  // withdrawals and all.
  const goals = categories
    .filter((c) => c.kind === "saving" && c.target !== null)
    .map((c) => {
      const now = balances.get(latest.id)?.get(c.id) ?? 0;
      const from = filled[Math.max(0, filled.length - 4)];
      const steps = filled.length - 1 - filled.indexOf(from);
      const pace = steps > 0 ? (now - (balances.get(from.id)?.get(c.id) ?? 0)) / steps : 0;
      const left = Math.max(0, (c.target ?? 0) - now);
      return { c, now, target: c.target ?? 0, left, pace, months: left > 0 && pace > 0 ? Math.ceil(left / pace) : null };
    });
  const rates = filled.map((p) => periodTotals(p, categories).savingsRate);
  const known = rates.filter((r): r is number => r !== null);
  const potsNow = pots
    .map((s) => ({ name: s.name, value: s.values[s.values.length - 1] ?? 0 }))
    .sort((a, b) => b.value - a.value);
  const potMax = Math.max(1, ...potsNow.map((p) => Math.abs(p.value)));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader title="Savings and pots" description={`Balances at the end of each month, up to ${periodShort(latest.month)}.`} />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Saved"
          value={totalOf(latest, isSaved)}
          previous={before ? { value: totalOf(before, isSaved), label: periodShort(before.month) } : null}
          upIsGood
          hint={saved.map((s) => s.name).join(" and ")}
        />
        <StatTile
          label="Investments and other"
          value={totalOf(latest, isOther)}
          previous={before ? { value: totalOf(before, isOther), label: periodShort(before.month) } : null}
          upIsGood
          hint={others.map((s) => s.name).join(", ")}
        />
        <StatTile label="In pots" value={totalOf(latest, isPot)} upIsGood hint="Set aside to spend" />
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

      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-heading">
              <Target className="size-4.5" /> Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-5 sm:grid-cols-2">
              {goals.map((g) => {
                const share = Math.min(1, g.now / g.target);
                return (
                  <li key={g.c.id} className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">{g.c.name}</span>
                      <span className="text-sm tabular-nums">
                        <span className="font-semibold text-heading">{formatKr(g.now)}</span>
                        <span className="text-muted-foreground"> of {formatKr(g.target)}</span>
                      </span>
                    </div>
                    <div
                      className="h-3 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-label={`${g.c.name}: ${Math.round(share * 100)}% of the goal`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(share * 100)}
                    >
                      <div
                        className={share >= 1 ? "h-full rounded-full bg-success" : "h-full rounded-full bg-primary"}
                        style={{ width: `${Math.max(share > 0 ? 3 : 0, share * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {g.left === 0
                        ? `Goal reached${g.now > g.target ? `, ${formatKr(g.now - g.target)} over` : ""}.`
                        : `${formatKr(g.left)} to go · ${Math.round(share * 100)}%${
                            g.months ? ` · about ${g.months} ${g.months === 1 ? "month" : "months"} at ${formatKr(g.pace)} a month` : ""
                          }`}
                    </span>
                  </li>
                );
              })}
            </ul>
            <Link href="/money/categories" className="mt-4 inline-block text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Change goals
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {saved.length > 0 && (
          <LineChart
            title="Your savings"
            description={`What you really save: ${saved.map((s) => s.name).join(" and ")}, at the end of each month.`}
            data={{ labels, series: saved }}
          />
        )}
        {others.length > 0 && (
          <LineChart
            title="Investments and other"
            description="Moved out of your budget, but not counted as saved."
            data={{ labels, series: others }}
          />
        )}
      </div>

      <ColumnChart
        title="Savings rate"
        description={`Share of each month's income you really saved${saved.length ? ` (${saved.map((s) => s.name).join(" and ")})` : ""}.`}
        unit="percent"
        data={{ labels, series: [{ key: "rate", name: "Savings rate", color: seriesColor(0), values: rates }] }}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
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
              <ColorKey
                used={
                  new Set(
                    filled.flatMap((p) =>
                      p.entries.filter((e) => pots.some((s) => s.key === e.categoryId)).map((e) => e.colors.balance),
                    ).filter((x): x is MoneyColor => !!x),
                  )
                }
                labels={colorLabels}
              />
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
                      {s.values.map((v, i) => {
                        const color = filled[i].entries.find((e) => e.categoryId === s.key)?.colors.balance;
                        return (
                          <td
                            key={labels[i]}
                            className="px-2 py-1.5 text-right whitespace-nowrap"
                            style={cellStyle(color)}
                            title={color ? colorLabels[color] : undefined}
                          >
                            {v === null ? "–" : formatKr(v).replace(" kr", "")}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted-foreground">What was left at the end of each month, in kr.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
