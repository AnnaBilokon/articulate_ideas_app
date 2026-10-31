import "server-only";
import {
  cleanColors,
  payPeriodOf,
  isMoneyColor,
  moneyColorNames,
  moneyColors,
  type MoneyCategory,
  type MoneyColor,
  type MoneyKind,
  type MoneyPeriod,
} from "@/lib/schemas";
import { db } from "@/lib/supabase";

// The Money workspace's data: categories, and every pay period with its
// entries and one-offs. Small enough to load whole.

export type MoneyData = {
  categories: MoneyCategory[];
  periods: MoneyPeriod[];
  /** What each colour means, as named by the user (default: the colour's name). */
  colorLabels: Record<MoneyColor, string>;
};

const num = (v: number | string | null) => (v === null ? null : Number(v));

export async function loadMoney(): Promise<MoneyData> {
  const [{ data: categories }, { data: periods }, { data: labels }, { data: fromPots }, { data: settings }] = await Promise.all([
    db().from("money_categories").select("id, name, kind, position, archived_at, counts_as_saved, target").order("position").order("created_at"),
    db()
      .from("money_periods")
      .select(
        "id, month, note, money_entries(category_id, amount, planned, spent, balance, note, colors), money_one_offs(id, title, amount, color, created_at)",
      )
      .order("month"),
    db().from("money_color_labels").select("color, label"),
    // Spending-tracker purchases taken from a pot.
    db().from("spend_purchases").select("spent_on, amount, spend_categories(pot_category_id)").eq("from_pot", true),
    db().from("money_settings").select("payday").eq("id", 1).maybeSingle(),
  ]);
  const payday = settings?.payday ?? 25;
  const potSpending = new Map<string, Record<string, number>>();
  for (const p of fromPots ?? []) {
    const pot = p.spend_categories?.pot_category_id;
    if (!pot) continue;
    const month = payPeriodOf(p.spent_on, payday);
    const sums = potSpending.get(month) ?? {};
    sums[pot] = (sums[pot] ?? 0) + Number(p.amount);
    potSpending.set(month, sums);
  }
  const named = new Map((labels ?? []).map((l) => [l.color, l.label]));
  return {
    categories: (categories ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind as MoneyKind,
      position: c.position,
      archived: c.archived_at !== null,
      countsAsSaved: c.counts_as_saved,
      target: c.target === null ? null : Number(c.target),
    })),
    periods: (periods ?? []).map((p) => ({
      id: p.id,
      month: p.month,
      note: p.note,
      entries: p.money_entries.map((e) => ({
        categoryId: e.category_id,
        amount: num(e.amount),
        planned: num(e.planned),
        spent: num(e.spent),
        balance: num(e.balance),
        note: e.note,
        colors: cleanColors(e.colors),
      })),
      oneOffs: [...p.money_one_offs]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((o) => ({ id: o.id, title: o.title, amount: Number(o.amount), color: isMoneyColor(o.color) ? o.color : null })),
      potSpending: potSpending.get(p.month) ?? {},
    })),
    colorLabels: Object.fromEntries(moneyColors.map((c) => [c, named.get(c) ?? moneyColorNames[c]])) as Record<MoneyColor, string>,
  };
}
