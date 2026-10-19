import { cookies } from "next/headers";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { LIGHT_DAY_COOKIE, dayKey } from "@/lib/reviews";
import { startOfDay } from "@/lib/schedule";

const bodySchema = z.object({ on: z.boolean() });

// "Too much?": makes today a light day with fewer reviews, or back to normal.
// The cookie names today and expires at midnight.
export async function POST(request: Request) {
  await requireSession();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });

  const jar = await cookies();
  if (parsed.data.on) {
    jar.set(LIGHT_DAY_COOKIE, dayKey(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: startOfDay(new Date(), 1),
    });
  } else {
    jar.delete(LIGHT_DAY_COOKIE);
  }
  return Response.json({ lightDay: parsed.data.on });
}
