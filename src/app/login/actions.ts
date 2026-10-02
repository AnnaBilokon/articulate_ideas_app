"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_MAX_AGE, isCorrectPassword, sessionToken } from "@/lib/auth";

// Only allow redirects to paths on this site.
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function login(formData: FormData) {
  const password = formData.get("password");
  const next = safeNext(formData.get("next"));

  if (typeof password !== "string" || !(await isCorrectPassword(password))) {
    // Slow down guessing.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect(next);
}
