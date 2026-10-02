import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Server-side client using the secret key, which bypasses RLS. Never import
// this from client components; "server-only" makes that a build error.

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function db() {
  return createClient<Database>(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
