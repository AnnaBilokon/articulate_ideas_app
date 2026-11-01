import "server-only";
import type { WishItem, WishList } from "@/lib/schemas";
import { db } from "@/lib/supabase";

// The wishlist: lists and items, with short-lived links to the private photos.

export const WISHLIST_BUCKET = "wishlist";
/** How long a photo link works: long enough for a visit. */
const LINK_SECONDS = 60 * 60;

export async function loadWishlist(): Promise<{ lists: WishList[]; items: WishItem[] }> {
  const [{ data: lists }, { data: items }] = await Promise.all([
    db().from("wish_lists").select("id, name").order("position").order("created_at"),
    db()
      .from("wish_items")
      .select("id, created_at, list_id, title, price, url, note, image_path, bought_at")
      .order("created_at", { ascending: false }),
  ]);
  const paths = (items ?? []).map((i) => i.image_path).filter((p): p is string => !!p);
  const links = new Map<string, string>();
  if (paths.length > 0) {
    const { data } = await db().storage.from(WISHLIST_BUCKET).createSignedUrls(paths, LINK_SECONDS);
    for (const l of data ?? []) if (l.path && l.signedUrl) links.set(l.path, l.signedUrl);
  }
  return {
    lists: lists ?? [],
    items: (items ?? []).map((i) => ({
      id: i.id,
      createdAt: i.created_at,
      listId: i.list_id,
      title: i.title,
      price: i.price === null ? null : Number(i.price),
      url: i.url,
      note: i.note,
      imagePath: i.image_path,
      imageUrl: i.image_path ? (links.get(i.image_path) ?? null) : null,
      boughtAt: i.bought_at,
    })),
  };
}
