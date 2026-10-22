import { z } from "zod";

// Money workspace: monthly totals per pay period. Pure functions, used on
// the server and in the browser.
//
// Free cash = income − expenses − one-offs − pot transfers − savings
// transfers, as in the budget sheet. Spending = expenses + one-offs + what
// was spent from pots (money moved into a pot isn't spent yet).

export const moneyKinds = ["income", "expense", "pot", "saving"] as const;
export type MoneyKind = (typeof moneyKinds)[number];

export const moneyKindInfo: Record<MoneyKind, { label: string; plural: string; hint: string }> = {
  income: { label: "Income", plural: "Income", hint: "Salary, benefits, anything that comes in" },
  expense: { label: "Expense", plural: "Bills and spending", hint: "Food, bills, subscriptions: what goes out each month" },
  pot: { label: "Pot", plural: "Pots", hint: "Money set aside each month for clothes, vacation and so on; what's left carries over" },
  saving: { label: "Saving", plural: "Savings", hint: "Transfers into savings and investments, with their balance" },
};

export type MoneyCategory = { id: string; name: string; kind: MoneyKind; position: number; archived: boolean };

export type MoneyEntry = {
  categoryId: string;
  /** Came in, spent, or transferred in the period; null until entered. */
  amount: number | null;
  planned: number | null;
  /** Pots: spent from the pot. */
  spent: number | null;
  /** Pots and savings: the balance at the end, when entered. */
  balance: number | null;
  note: string | null;
};

export type MoneyOneOff = { id: string; title: string; amount: number };

export type MoneyPeriod = { id: string; month: string; note: string | null; entries: MoneyEntry[]; oneOffs: MoneyOneOff[] };

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-06-01" → "Jun–Jul 2026"; "2026-12-01" → "Dec 2026–Jan 2027". */
export function periodLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (m === 12) return `Dec ${y}–Jan ${y + 1}`;
  return `${monthNames[m - 1]}–${monthNames[m]} ${y}`;
}

/** Short, for chart axes: "Jun–Jul". */
export function periodShort(month: string): string {
  const m = Number(month.split("-")[1]);
  return `${monthNames[m - 1]}–${monthNames[m % 12]}`;
}

export function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

/** "2026-06-01" ⇄ "2026-06", for URLs. */
export const monthSlug = (month: string) => month.slice(0, 7);
export const monthFromSlug = (slug: string) => (/^\d{4}-(0[1-9]|1[0-2])$/.test(slug) ? `${slug}-01` : null);

const krFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

/** 12816 → "12,816 kr". */
export const formatKr = (value: number) => `${krFormat.format(Math.round(value)).replace("-", "−")} kr`;

/** For axis ticks: 0, 5K, 12.5K. */
export function formatCompactKr(value: number): string {
  if (Math.abs(value) < 1000) return krFormat.format(value);
  const k = value / 1000;
  return `${Number.isInteger(k) ? k : k.toFixed(1)}K`;
}

export type PeriodTotals = {
  income: number;
  plannedIncome: number;
  expenses: number;
  plannedExpenses: number;
  oneOffs: number;
  potTransfers: number;
  potSpent: number;
  savingTransfers: number;
  plannedPotTransfers: number;
  plannedSavingTransfers: number;
  freeCash: number;
  /** What free cash would be if everything went as expected. */
  plannedFreeCash: number;
  /** What actually left: expenses, one-offs, and spending from pots. */
  spending: number;
  /** Savings transfers as a share of income, 0-1; null without income. */
  savingsRate: number | null;
  /** Any actual amount entered yet. */
  started: boolean;
};

export function periodTotals(period: MoneyPeriod, categories: MoneyCategory[]): PeriodTotals {
  const kindOf = new Map(categories.map((c) => [c.id, c.kind]));
  const t = {
    income: 0,
    plannedIncome: 0,
    expenses: 0,
    plannedExpenses: 0,
    potTransfers: 0,
    potSpent: 0,
    savingTransfers: 0,
    plannedPotTransfers: 0,
    plannedSavingTransfers: 0,
  };
  let started = false;
  for (const e of period.entries) {
    const kind = kindOf.get(e.categoryId);
    const amount = e.amount ?? 0;
    if (e.amount !== null) started = true;
    if (kind === "income") {
      t.income += amount;
      t.plannedIncome += e.planned ?? 0;
    } else if (kind === "expense") {
      t.expenses += amount;
      t.plannedExpenses += e.planned ?? 0;
    } else if (kind === "pot") {
      t.potTransfers += amount;
      t.potSpent += e.spent ?? 0;
      t.plannedPotTransfers += e.planned ?? e.amount ?? 0;
    } else if (kind === "saving") {
      t.savingTransfers += amount;
      t.plannedSavingTransfers += e.planned ?? e.amount ?? 0;
    }
  }
  const oneOffs = period.oneOffs.reduce((s, o) => s + o.amount, 0);
  if (period.oneOffs.length > 0) started = true;
  return {
    ...t,
    oneOffs,
    freeCash: t.income - t.expenses - oneOffs - t.potTransfers - t.savingTransfers,
    plannedFreeCash: t.plannedIncome - t.plannedExpenses - t.plannedPotTransfers - t.plannedSavingTransfers,
    spending: t.expenses + oneOffs + t.potSpent,
    savingsRate: t.income > 0 ? t.savingTransfers / t.income : null,
    started,
  };
}

/**
 * Balances of pots and savings at the end of each period, oldest first. An
 * entered balance wins; otherwise the one before, plus what went in, minus
 * what was spent. Keyed by period id, then category id.
 */
export function runningBalances(periods: MoneyPeriod[], categories: MoneyCategory[]): Map<string, Map<string, number>> {
  const tracked = categories.filter((c) => c.kind === "pot" || c.kind === "saving");
  const result = new Map<string, Map<string, number>>();
  const last = new Map<string, number>();
  for (const p of [...periods].sort((a, b) => a.month.localeCompare(b.month))) {
    const byCategory = new Map(p.entries.map((e) => [e.categoryId, e]));
    const balances = new Map<string, number>();
    for (const c of tracked) {
      const e = byCategory.get(c.id);
      const before = last.get(c.id);
      if (!e && before === undefined) continue;
      const value = e?.balance ?? (before ?? 0) + (e?.amount ?? 0) - (e?.spent ?? 0);
      balances.set(c.id, value);
      last.set(c.id, value);
    }
    result.set(p.id, balances);
  }
  return result;
}

// Saving a month: every entry, and the one-offs.
const money = z.number().min(-1e10).max(1e10).nullable();

export const periodInputSchema = z.object({
  entries: z
    .array(
      z.object({
        categoryId: z.uuid(),
        amount: money,
        planned: money,
        spent: money,
        balance: money,
        note: z.string().trim().max(500).nullable(),
      }),
    )
    .max(200),
  oneOffs: z
    .array(z.object({ title: z.string().trim().min(1, "Name the one-off.").max(120), amount: z.number().min(-1e10).max(1e10) }))
    .max(50),
  note: z.string().trim().max(2000).nullable(),
});
export type PeriodInput = z.infer<typeof periodInputSchema>;

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Name the category.").max(60, "Keep the name under 60 characters."),
  kind: z.enum(moneyKinds),
});
