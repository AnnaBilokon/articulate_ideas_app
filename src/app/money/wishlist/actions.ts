"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { wishItemSchema, wishListNameSchema, type WishItemInput } from "@/lib/schemas";
import { db } from "@/lib/supabase";
import { WISHLIST_BUCKET } from "@/lib/wishlist";

// The wishlist: lists, items, ticking off, and removing photos with items.

type Result = { error: string | null };

const isId = (id: string) => z.uuid().safeParse(id).success;

function refresh() {
  revalidatePath("/");
  revalidatePath("/money/wishlist");
}

/** Removes a photo from storage; a failure leaves an orphan file, never an error for the user. */
async function removeImage(path: string | null) {
  if (path) await db().storage.from(WISHLIST_BUCKET).remove([path]);
}

export async function createWishList(name: string): Promise<Result & { id?: string }> {
  await requireSession();
  const parsed = wishListNameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { data: last } = await db().from("wish_lists").select("position").order("position", { ascending: false }).limit(1);
  const { data, error } = await db()
    .from("wish_lists")
    .insert({ name: parsed.data, position: (last?.[0]?.position ?? -1) + 1 })
    .select("id")
    .single();
  if (error?.code === "23505") return { error: "You have a list with that name." };
  if (error) return { error: "Could not make the list. Try again." };
  refresh();
  return { error: null, id: data.id };
}

export async function renameWishList(id: string, name: string): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "List not found." };
  const parsed = wishListNameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await db().from("wish_lists").update({ name: parsed.data }).eq("id", id);
  if (error?.code === "23505") return { error: "You have a list with that name." };
  if (error) return { error: "Could not rename it. Try again." };
  refresh();
  return { error: null };
}

/** Deletes a list; its items stay, without a list. */
export async function deleteWishList(id: string): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "List not found." };
  const { error } = await db().from("wish_lists").delete().eq("id", id);
  if (error) return { error: "Could not delete it. Try again." };
  refresh();
  return { error: null };
}

const itemColumns = (i: WishItemInput) => ({
  title: i.title,
  list_id: i.listId,
  price: i.price,
  url: i.url || null,
  note: i.note || null,
  image_path: i.imagePath,
});

export async function addWishItem(input: WishItemInput): Promise<Result> {
  await requireSession();
  const parsed = wishItemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await db().from("wish_items").insert(itemColumns(parsed.data));
  if (error) return { error: "Could not save it. Try again." };
  refresh();
  return { error: null };
}

export async function updateWishItem(id: string, input: WishItemInput): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Item not found." };
  const parsed = wishItemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { data: before } = await db().from("wish_items").select("image_path").eq("id", id).maybeSingle();
  const { error } = await db().from("wish_items").update(itemColumns(parsed.data)).eq("id", id);
  if (error) return { error: "Could not save it. Try again." };
  // A replaced or removed photo goes from storage too.
  if (before?.image_path && before.image_path !== parsed.data.imagePath) await removeImage(before.image_path);
  refresh();
  return { error: null };
}

/** Ticks an item off as bought, or puts it back on the list. */
export async function setWishItemBought(id: string, bought: boolean): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Item not found." };
  const { error } = await db()
    .from("wish_items")
    .update({ bought_at: bought ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { error: "Could not update it. Try again." };
  refresh();
  return { error: null };
}

export async function deleteWishItem(id: string): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Item not found." };
  const { data, error } = await db().from("wish_items").delete().eq("id", id).select("image_path").maybeSingle();
  if (error) return { error: "Could not delete it. Try again." };
  await removeImage(data?.image_path ?? null);
  refresh();
  return { error: null };
}
