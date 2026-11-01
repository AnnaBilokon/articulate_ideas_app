import { z } from "zod";

// Money: the wishlist. Lists of your own, and things to buy later, each with
// an optional photo or screenshot, price, link and note.

export type WishList = { id: string; name: string };

export type WishItem = {
  id: string;
  createdAt: string;
  listId: string | null;
  title: string;
  price: number | null;
  url: string | null;
  note: string | null;
  /** The photo's path in storage, and a short-lived link to show it. */
  imagePath: string | null;
  imageUrl: string | null;
  boughtAt: string | null;
};

export const wishListNameSchema = z.string().trim().min(1, "Name the list.").max(40, "Keep the name under 40 characters.");

export const wishItemSchema = z.object({
  title: z.string().trim().min(1, "Say what it is.").max(120, "Keep it under 120 characters."),
  listId: z.uuid().nullable(),
  price: z.number().min(0, "A price is 0 or more.").max(1e9).nullable(),
  url: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => v === "" || /^https?:\/\//i.test(v), "A link starts with http:// or https://."),
  note: z.string().trim().max(500, "Keep the note under 500 characters."),
  imagePath: z.string().max(300).nullable(),
});
export type WishItemInput = z.infer<typeof wishItemSchema>;

/** Photos are resized in the browser first; the server still checks. */
export const WISH_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const WISH_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
