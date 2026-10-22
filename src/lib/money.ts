import "server-only";
import type { MoneyCategory, MoneyKind, MoneyPeriod } from "@/lib/schemas";
import { db } from "@/lib/supabase";

// The Money workspace's data: categories, and every pay period with its
// entries and one-offs. Small enough to load whole.

export type MoneyData = { categories: MoneyCategory[]; periods: MoneyPeriod[] };

const num = (v: number | string | null) => (v === null ? null : Number(v));

export async function loadMoney(): Promise<MoneyData> {
  const [{ data: categories }, { data: periods }] = await Promise.all([
    db().from("money_categories").select("id, name, kind, position, archived_at").order("position").order("created_at"),
    db()
      .from("money_periods")
      .select("id, month, note, money_entries(category_id, amount, planned, spent, balance, note), money_one_offs(id, title, amount, created_at)")
      .order("month"),
  ]);
  return {
    categories: (categories ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind as MoneyKind,
      position: c.position,
      archived: c.archived_at !== null,
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
      })),
      oneOffs: [...p.money_one_offs]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((o) => ({ id: o.id, title: o.title, amount: Number(o.amount) })),
    })),
  };
}
