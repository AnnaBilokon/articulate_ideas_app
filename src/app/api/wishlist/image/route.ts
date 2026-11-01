import { requireSession } from "@/lib/auth";
import { WISH_IMAGE_MAX_BYTES, WISH_IMAGE_TYPES } from "@/lib/schemas";
import { db } from "@/lib/supabase";
import { WISHLIST_BUCKET } from "@/lib/wishlist";

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Stores a wishlist photo (already resized in the browser) in the private
// bucket, and answers with its path and a short-lived link to show it.
export async function POST(request: Request) {
  await requireSession();
  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) return Response.json({ error: "Choose a photo." }, { status: 400 });
  if (!(WISH_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return Response.json({ error: "That isn't a photo or screenshot we can use." }, { status: 400 });
  }
  if (file.size > WISH_IMAGE_MAX_BYTES) return Response.json({ error: "That photo is too big." }, { status: 400 });

  const path = `${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
  const { error } = await db().storage.from(WISHLIST_BUCKET).upload(path, file, { contentType: file.type });
  if (error) {
    console.error("wishlist image upload failed:", error);
    return Response.json({ error: "Could not save the photo. Try again." }, { status: 500 });
  }
  const { data } = await db().storage.from(WISHLIST_BUCKET).createSignedUrl(path, 60 * 60);
  return Response.json({ path, url: data?.signedUrl ?? null });
}
