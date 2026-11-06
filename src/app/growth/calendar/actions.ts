"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { EVENT_COLUMNS, toEvent, whenColumns } from "@/lib/calendar";
import { sendPush } from "@/lib/push";
import { calendarEventSchema, eventWhenSchema, type CalendarEvent, type CalendarEventInput, type EventWhen } from "@/lib/schemas";
import { db } from "@/lib/supabase";

// Calendar events: add, change, move or resize, tick off, delete. Each returns
// the saved event, so the calendar can show it without a reload.

type Result = { error: string | null; event?: CalendarEvent };

const isId = (id: string) => z.uuid().safeParse(id).success;

export async function createEvent(input: CalendarEventInput): Promise<Result> {
  await requireSession();
  const parsed = calendarEventSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { title, notes, color, when } = parsed.data;
  const { data, error } = await db()
    .from("calendar_events")
    .insert({ title, notes: notes || null, color, ...whenColumns(when) })
    .select(EVENT_COLUMNS)
    .single();
  if (error) return { error: "Could not save it. Try again." };
  revalidatePath("/growth/calendar");
  return { error: null, event: toEvent(data) };
}

export async function updateEvent(id: string, input: CalendarEventInput): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Not found." };
  const parsed = calendarEventSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { title, notes, color, when } = parsed.data;
  return save(id, { title, notes: notes || null, color, ...whenColumns(when) });
}

/** Dragged to a new time or day, or resized. */
export async function moveEvent(id: string, when: EventWhen): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Not found." };
  const parsed = eventWhenSchema.safeParse(when);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  return save(id, whenColumns(parsed.data));
}

export async function setEventDone(id: string, done: boolean): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Not found." };
  return save(id, { done_at: done ? new Date().toISOString() : null });
}

export async function deleteEvent(id: string): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Not found." };
  const { error } = await db().from("calendar_events").delete().eq("id", id);
  if (error) return { error: "Could not delete it. Try again." };
  revalidatePath("/growth/calendar");
  return { error: null };
}

type EventFields = {
  title?: string;
  notes?: string | null;
  color?: string;
  day?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  done_at?: string | null;
  reminded_at?: string | null;
};

async function save(id: string, fields: EventFields): Promise<Result> {
  // Remind again only when the start really changed, not on a new name.
  if (fields.reminded_at === null && fields.starts_at) {
    const { data: current } = await db().from("calendar_events").select("starts_at").eq("id", id).maybeSingle();
    if (current?.starts_at && new Date(current.starts_at).getTime() === new Date(fields.starts_at).getTime()) {
      delete fields.reminded_at;
    }
  }
  const { data, error } = await db().from("calendar_events").update(fields).eq("id", id).select(EVENT_COLUMNS).single();
  if (error) return { error: "Could not save it. Try again." };
  revalidatePath("/growth/calendar");
  return { error: null, event: toEvent(data) };
}

// --- Reminders: devices that get a push 5 minutes before each block --------

const subscriptionSchema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** Saves this device's push subscription (again, if it's already saved). */
export async function savePushSubscription(subscription: unknown, device: string): Promise<{ error: string | null }> {
  await requireSession();
  const parsed = subscriptionSchema.safeParse(subscription);
  if (!parsed.success) return { error: "This device didn't give a usable subscription. Try again." };
  const { endpoint, keys } = parsed.data;
  const { error } = await db()
    .from("push_subscriptions")
    .upsert({ endpoint, p256dh: keys.p256dh, auth: keys.auth, device: device.slice(0, 60) }, { onConflict: "endpoint" });
  return { error: error ? "Could not turn reminders on. Try again." : null };
}

export async function removePushSubscription(endpoint: string): Promise<{ error: string | null }> {
  await requireSession();
  const { error } = await db().from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { error: error ? "Could not turn reminders off. Try again." : null };
}

/** A test reminder to this device only. */
export async function sendTestReminder(endpoint: string): Promise<{ error: string | null }> {
  await requireSession();
  try {
    const sent = await sendPush({ title: "Reminders are on", body: "You'll get one like this 5 minutes before each block.", url: "/growth/calendar", tag: "test" }, endpoint);
    return { error: sent > 0 ? null : "The test didn't go through. Turn reminders off and on again." };
  } catch (error) {
    console.error("test reminder failed:", error);
    return { error: "Reminders aren't set up on the server yet." };
  }
}
