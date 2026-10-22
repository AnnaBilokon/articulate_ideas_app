"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { loadMoney } from "@/lib/money";
import { localDate } from "@/lib/schedule";
import { categoryInputSchema, nextMonth, periodInputSchema, type MoneyKind, type PeriodInput } from "@/lib/schemas";
import { db } from "@/lib/supabase";

// Saving a month, starting the next one, and managing categories.

type Result = { error: string | null };

const isId = (id: string) => z.uuid().safeParse(id).success;

function refresh() {
  revalidatePath("/");
  revalidatePath("/money", "layout");
}

/** Saves every entry and one-off of a period at once. */
export async function savePeriod(periodId: string, input: PeriodInput): Promise<Result> {
  await requireSession();
  if (!isId(periodId)) return { error: "Month not found." };
  const parsed = periodInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error: noteError } = await db().from("money_periods").update({ note: parsed.data.note || null }).eq("id", periodId);
  if (noteError) return { error: "Could not save the month. Try again." };
  if (parsed.data.entries.length > 0) {
    const { error } = await db()
      .from("money_entries")
      .upsert(
        parsed.data.entries.map((e) => ({
          period_id: periodId,
          category_id: e.categoryId,
          amount: e.amount,
          planned: e.planned,
          spent: e.spent,
          balance: e.balance,
          note: e.note || null,
        })),
        { onConflict: "period_id,category_id" },
      );
    if (error) return { error: "Could not save the month. Try again." };
  }
  // One-offs are replaced as a set.
  const { error: clearError } = await db().from("money_one_offs").delete().eq("period_id", periodId);
  if (clearError) return { error: "Could not save the one-offs. Try again." };
  if (parsed.data.oneOffs.length > 0) {
    const { error } = await db()
      .from("money_one_offs")
      .insert(parsed.data.oneOffs.map((o) => ({ period_id: periodId, title: o.title, amount: o.amount })));
    if (error) return { error: "Could not save the one-offs. Try again." };
  }
  refresh();
  return { error: null };
}

/**
 * Starts the pay period after the latest one (or this month's, if there are
 * none), with every active category and last month's expected amounts.
 */
export async function startNextPeriod(): Promise<Result & { month?: string }> {
  await requireSession();
  const { categories, periods } = await loadMoney();
  const latest = periods.at(-1);
  const month = latest ? nextMonth(latest.month) : `${localDate().slice(0, 7)}-01`;

  const { data: period, error } = await db().from("money_periods").insert({ month }).select("id").single();
  if (error?.code === "23505") return { error: "That month exists already." };
  if (error) return { error: "Could not start the month. Try again." };

  const before = new Map(latest?.entries.map((e) => [e.categoryId, e]));
  const active = categories.filter((c) => !c.archived);
  if (active.length > 0) {
    const { error: entriesError } = await db()
      .from("money_entries")
      .insert(
        active.map((c) => {
          const prev = before.get(c.id);
          return {
            period_id: period.id,
            category_id: c.id,
            // Expect what was expected last month, or else what it actually was.
            planned: prev?.planned ?? prev?.amount ?? null,
            note: prev?.note ?? null,
          };
        }),
      );
    if (entriesError) return { error: "The month started, but its categories didn't. Try saving it.", month };
  }
  refresh();
  return { error: null, month };
}

export async function deletePeriod(periodId: string): Promise<Result> {
  await requireSession();
  if (!isId(periodId)) return { error: "Month not found." };
  const { error } = await db().from("money_periods").delete().eq("id", periodId);
  if (error) return { error: "Could not delete the month. Try again." };
  refresh();
  return { error: null };
}

export async function addCategory(input: { name: string; kind: MoneyKind }): Promise<Result> {
  await requireSession();
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { data: last } = await db()
    .from("money_categories")
    .select("position")
    .eq("kind", parsed.data.kind)
    .order("position", { ascending: false })
    .limit(1);
  const { data, error } = await db()
    .from("money_categories")
    .insert({ name: parsed.data.name, kind: parsed.data.kind, position: (last?.[0]?.position ?? -1) + 1 })
    .select("id")
    .single();
  if (error?.code === "23505") return { error: "That category exists already." };
  if (error) return { error: "Could not add the category. Try again." };

  // It joins the latest month, so it can be filled in right away.
  const { data: latest } = await db().from("money_periods").select("id").order("month", { ascending: false }).limit(1);
  if (latest?.[0]) await db().from("money_entries").insert({ period_id: latest[0].id, category_id: data.id });
  refresh();
  return { error: null };
}

export async function renameCategory(id: string, name: string): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Category not found." };
  const parsed = categoryInputSchema.shape.name.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await db().from("money_categories").update({ name: parsed.data }).eq("id", id);
  if (error?.code === "23505") return { error: "That name is taken." };
  if (error) return { error: "Could not rename it. Try again." };
  refresh();
  return { error: null };
}

/** Hides a category from new months (past months keep it), or brings it back. */
export async function setCategoryArchived(id: string, archived: boolean): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Category not found." };
  const { error } = await db()
    .from("money_categories")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { error: "Could not update it. Try again." };
  refresh();
  return { error: null };
}

/** Moves a category one place up or down within its kind. */
export async function moveCategory(id: string, direction: -1 | 1): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Category not found." };
  const { data: me } = await db().from("money_categories").select("kind").eq("id", id).maybeSingle();
  if (!me) return { error: "Category not found." };
  const { data: list } = await db().from("money_categories").select("id").eq("kind", me.kind).order("position").order("created_at");
  const ids = (list ?? []).map((c) => c.id);
  const i = ids.indexOf(id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= ids.length) return { error: null };
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await Promise.all(ids.map((cid, position) => db().from("money_categories").update({ position }).eq("id", cid)));
  refresh();
  return { error: null };
}
