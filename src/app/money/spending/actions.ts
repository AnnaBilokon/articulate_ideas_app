"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { localDate } from "@/lib/schedule";
import { paydaySchema, purchaseSchema, spendCategorySchema, type PurchaseInput, type SpendCategoryInput } from "@/lib/schemas";
import { db } from "@/lib/supabase";

// The spending tracker: categories, purchases, and the payday.

type Result = { error: string | null };

const isId = (id: string) => z.uuid().safeParse(id).success;

function refresh() {
  // Pots in Money count purchases taken from them, so Money refreshes too.
  revalidatePath("/money", "layout");
}

/** A pot to link must be a Money pot. */
async function isPot(id: string | null): Promise<boolean> {
  if (id === null) return true;
  const { data } = await db().from("money_categories").select("kind").eq("id", id).maybeSingle();
  return data?.kind === "pot";
}

export async function saveSpendCategory(id: string | null, input: SpendCategoryInput): Promise<Result> {
  await requireSession();
  if (id !== null && !isId(id)) return { error: "Category not found." };
  const parsed = spendCategorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isPot(parsed.data.potCategoryId))) return { error: "Pick one of your pots." };
  const columns = { name: parsed.data.name, icon: parsed.data.icon, color: parsed.data.color, pot_category_id: parsed.data.potCategoryId };
  let error;
  if (id) {
    ({ error } = await db().from("spend_categories").update(columns).eq("id", id));
  } else {
    const { data: last } = await db().from("spend_categories").select("position").order("position", { ascending: false }).limit(1);
    ({ error } = await db().from("spend_categories").insert({ ...columns, position: (last?.[0]?.position ?? -1) + 1 }));
  }
  if (error?.code === "23505") return { error: "You have a category with that name already." };
  if (error) return { error: "Could not save the category. Try again." };
  refresh();
  return { error: null };
}

/** Hides a category from adding purchases (its purchases stay), or brings it back. */
export async function setSpendCategoryArchived(id: string, archived: boolean): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Category not found." };
  const { error } = await db()
    .from("spend_categories")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { error: "Could not update it. Try again." };
  refresh();
  return { error: null };
}

/** Deletes a category with no purchases; one with purchases can only be hidden. */
export async function deleteSpendCategory(id: string): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Category not found." };
  const { error } = await db().from("spend_categories").delete().eq("id", id);
  if (error?.code === "23503") return { error: "It has purchases. Hide it instead, so they stay." };
  if (error) return { error: "Could not delete it. Try again." };
  refresh();
  return { error: null };
}

async function checkPurchase(input: PurchaseInput) {
  const parsed = purchaseSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message, data: null };
  if (parsed.data.spentOn > localDate(new Date(), 1)) return { error: "That date hasn't come yet.", data: null };
  if (parsed.data.fromPot) {
    // Only a category linked to a pot can take from one.
    const { data } = await db().from("spend_categories").select("pot_category_id").eq("id", parsed.data.categoryId).maybeSingle();
    if (!data?.pot_category_id) return { error: null, data: { ...parsed.data, fromPot: false } };
  }
  return { error: null, data: parsed.data };
}

const purchaseColumns = (p: z.infer<typeof purchaseSchema>) => ({
  category_id: p.categoryId,
  spent_on: p.spentOn,
  amount: p.amount,
  note: p.note || null,
  from_pot: p.fromPot,
});

export async function addPurchase(input: PurchaseInput): Promise<Result> {
  await requireSession();
  const { error: invalid, data } = await checkPurchase(input);
  if (!data) return { error: invalid };
  const { error } = await db().from("spend_purchases").insert(purchaseColumns(data));
  if (error) return { error: "Could not save it. Try again." };
  refresh();
  return { error: null };
}

export async function updatePurchase(id: string, input: PurchaseInput): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Purchase not found." };
  const { error: invalid, data } = await checkPurchase(input);
  if (!data) return { error: invalid };
  const { error } = await db().from("spend_purchases").update(purchaseColumns(data)).eq("id", id);
  if (error) return { error: "Could not save it. Try again." };
  refresh();
  return { error: null };
}

export async function deletePurchase(id: string): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Purchase not found." };
  const { error } = await db().from("spend_purchases").delete().eq("id", id);
  if (error) return { error: "Could not delete it. Try again." };
  refresh();
  return { error: null };
}

export async function setPayday(payday: number): Promise<Result> {
  await requireSession();
  const parsed = paydaySchema.safeParse(payday);
  if (!parsed.success) return { error: "Pick a day from 1 to 28." };
  const { error } = await db().from("money_settings").upsert({ id: 1, payday: parsed.data });
  if (error) return { error: "Could not save the payday. Try again." };
  refresh();
  return { error: null };
}
