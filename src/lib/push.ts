import "server-only";
import webpush from "web-push";
import { db } from "@/lib/supabase";

// Web push to the devices that turned reminders on. The keys come from
// NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.

export type PushMessage = { title: string; body: string; url: string; tag?: string };

let configured = false;

function configure(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  // The app's address tells the push services who is sending.
  webpush.setVapidDetails("https://articulate-ideas-app.vercel.app", publicKey, privateKey);
  configured = true;
  return true;
}

/**
 * Sends a message to every saved device, or only to `endpoint`. Devices the
 * push service says are gone (unsubscribed, app removed) are forgotten.
 * Returns how many got it.
 */
export async function sendPush(message: PushMessage, endpoint?: string): Promise<number> {
  if (!configure()) throw new Error("Push keys are missing.");
  let query = db().from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (endpoint) query = query.eq("endpoint", endpoint);
  const { data: subscriptions } = await query;

  const results = await Promise.all(
    (subscriptions ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(message), {
          TTL: 10 * 60, // A reminder is no use after the block has started.
          urgency: "high",
        });
        return true;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await db().from("push_subscriptions").delete().eq("id", s.id);
        else console.error("push failed:", status, (error as Error).message);
        return false;
      }
    }),
  );
  return results.filter(Boolean).length;
}
