import { timingSafeEqual } from "node:crypto";
import { sendPush } from "@/lib/push";
import { localDate, zonedMinutes } from "@/lib/schedule";
import { formatMinutes } from "@/lib/schemas";
import { db } from "@/lib/supabase";

export const maxDuration = 30;

// How far ahead a block reminds you, and how late a reminder may still go out
// (a missed minute, a block added just before it starts).
const AHEAD_MS = 5 * 60_000 + 30_000;
const LATE_MS = 60_000;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

// Called every minute by Supabase (pg_cron): pushes a reminder for each block
// that starts in the next 5 minutes and hasn't reminded yet. Marking them
// first, in one update, means two runs at once can't send one twice.
export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Not allowed." }, { status: 401 });

  const now = new Date();
  const { data: due, error } = await db()
    .from("calendar_events")
    .update({ reminded_at: now.toISOString() })
    .is("reminded_at", null)
    .is("done_at", null)
    .gt("starts_at", new Date(now.getTime() - LATE_MS).toISOString())
    .lte("starts_at", new Date(now.getTime() + AHEAD_MS).toISOString())
    .select("id, title, starts_at");
  if (error) {
    console.error("reminders failed:", error);
    return Response.json({ error: "Could not read the calendar." }, { status: 500 });
  }

  let sent = 0;
  for (const event of due ?? []) {
    const starts = new Date(event.starts_at!);
    const minutes = Math.round((starts.getTime() - now.getTime()) / 60_000);
    sent += await sendPush({
      title: event.title,
      body: minutes > 0 ? `In ${minutes} ${minutes === 1 ? "minute" : "minutes"}, at ${formatMinutes(zonedMinutes(starts))}` : `Starting now, at ${formatMinutes(zonedMinutes(starts))}`,
      url: `/growth/calendar?date=${localDate(starts)}&view=day`,
      tag: event.id,
    });
  }
  return Response.json({ reminders: due?.length ?? 0, sent });
}
