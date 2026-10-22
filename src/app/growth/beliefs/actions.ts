"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { beliefSchema, strengthSchema, type BeliefInput, type BeliefStatus, type StrengthInput } from "@/lib/schemas";
import { db } from "@/lib/supabase";

// Limiting beliefs (the guided reframe) and strengths with their examples.

type Result = { error: string | null };

const isId = (id: string) => z.uuid().safeParse(id).success;

function refresh(path?: string) {
  revalidatePath("/");
  revalidatePath("/growth/beliefs");
  revalidatePath("/growth/strengths");
  revalidatePath("/growth/achievements");
  if (path) revalidatePath(path);
}

const beliefColumns = (b: BeliefInput) => ({
  belief: b.belief,
  origin: b.origin || null,
  evidence_against: b.evidenceAgainst || null,
  reframe: b.reframe || null,
  strength_start: b.strengthStart,
  strength_now: b.strengthNow,
});

export async function createBelief(input: BeliefInput): Promise<Result & { id?: string }> {
  await requireSession();
  const parsed = beliefSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { data, error } = await db().from("beliefs").insert(beliefColumns(parsed.data)).select("id").single();
  if (error) return { error: "Could not save it. Try again." };
  refresh();
  return { error: null, id: data.id };
}

export async function updateBelief(id: string, input: BeliefInput): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Not found." };
  const parsed = beliefSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await db()
    .from("beliefs")
    .update({ ...beliefColumns(parsed.data), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: "Could not save it. Try again." };
  refresh(`/growth/beliefs/${id}`);
  return { error: null };
}

/** "Let it go" when it no longer holds you back, or back to working on it. */
export async function setBeliefStatus(id: string, status: BeliefStatus): Promise<Result> {
  await requireSession();
  if (!isId(id) || (status !== "working_on" && status !== "let_go")) return { error: "Not found." };
  const { error } = await db()
    .from("beliefs")
    .update({
      status,
      let_go_at: status === "let_go" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: "Could not update it. Try again." };
  refresh(`/growth/beliefs/${id}`);
  return { error: null };
}

export async function deleteBelief(id: string): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Not found." };
  const { error } = await db().from("beliefs").delete().eq("id", id);
  if (error) return { error: "Could not delete it. Try again." };
  refresh();
  return { error: null };
}

export async function saveStrength(id: string | null, input: StrengthInput): Promise<Result> {
  await requireSession();
  if (id !== null && !isId(id)) return { error: "Not found." };
  const parsed = strengthSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const columns = { title: parsed.data.title, description: parsed.data.description || null };
  const { error } = id
    ? await db().from("strengths").update(columns).eq("id", id)
    : await db().from("strengths").insert(columns);
  if (error?.code === "23505") return { error: "You have that strength already." };
  if (error) return { error: "Could not save it. Try again." };
  refresh();
  return { error: null };
}

export async function deleteStrength(id: string): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Not found." };
  const { error } = await db().from("strengths").delete().eq("id", id);
  if (error) return { error: "Could not delete it. Try again." };
  refresh();
  return { error: null };
}

/** Sets which achievements show a strength. */
export async function setStrengthExamples(strengthId: string, achievementIds: string[]): Promise<Result> {
  await requireSession();
  if (!isId(strengthId) || !achievementIds.every(isId) || achievementIds.length > 200) return { error: "Not found." };
  const { error: clearError } = await db().from("strength_achievements").delete().eq("strength_id", strengthId);
  if (clearError) return { error: "Could not save it. Try again." };
  if (achievementIds.length > 0) {
    const { error } = await db()
      .from("strength_achievements")
      .insert([...new Set(achievementIds)].map((achievement_id) => ({ strength_id: strengthId, achievement_id })));
    if (error) return { error: "Could not save it. Try again." };
  }
  refresh();
  return { error: null };
}
