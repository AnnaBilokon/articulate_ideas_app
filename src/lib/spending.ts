import "server-only";
import { spendColors, spendIcons, type SpendCategory, type SpendColor, type SpendIcon, type SpendPurchase } from "@/lib/schemas";
import { db } from "@/lib/supabase";

// The spending tracker's data: categories, every purchase, and the payday
// that starts each pay period. Small enough to load whole.

export type SpendingData = {
  categories: SpendCategory[];
  purchases: SpendPurchase[];
  payday: number;
  /** Money pots a category can be linked to. */
  pots: { id: string; name: string }[];
};

export async function loadSpending(): Promise<SpendingData> {
  const [{ data: categories }, { data: purchases }, { data: settings }, { data: pots }] = await Promise.all([
    db().from("spend_categories").select("id, name, icon, color, position, archived_at, pot_category_id").order("position").order("created_at"),
    db()
      .from("spend_purchases")
      .select("id, category_id, spent_on, amount, note, from_pot")
      .order("spent_on", { ascending: false })
      .order("created_at", { ascending: false }),
    db().from("money_settings").select("payday").eq("id", 1).maybeSingle(),
    db().from("money_categories").select("id, name").eq("kind", "pot").is("archived_at", null).order("position"),
  ]);
  return {
    categories: (categories ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      // An icon or colour this version doesn't know shows as a plain one.
      icon: (spendIcons as readonly string[]).includes(c.icon) ? (c.icon as SpendIcon) : "sparkles",
      color: (spendColors as readonly string[]).includes(c.color) ? (c.color as SpendColor) : "blue",
      position: c.position,
      archived: c.archived_at !== null,
      potCategoryId: c.pot_category_id,
    })),
    purchases: (purchases ?? []).map((p) => ({
      id: p.id,
      categoryId: p.category_id,
      spentOn: p.spent_on,
      amount: Number(p.amount),
      note: p.note,
      fromPot: p.from_pot,
    })),
    payday: settings?.payday ?? 25,
    pots: pots ?? [],
  };
}
