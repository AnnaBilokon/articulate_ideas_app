// Single-password lock. The session cookie holds an HMAC derived from
// APP_PASSWORD, never the password itself; changing the password logs out
// every device.

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 90; // 90 days, in seconds

const encoder = new TextEncoder();

function appPassword(): string {
  const password = process.env.APP_PASSWORD;
  if (!password) throw new Error("APP_PASSWORD is not set");
  return password;
}

async function hmac(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return Buffer.from(signature).toString("hex");
}

// Compares in time independent of where the strings differ.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function sessionToken(): Promise<string> {
  return hmac(appPassword(), "session-v1");
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  return safeEqual(token, await sessionToken());
}

// For Server Functions: the proxy guards routes, but Next.js recommends each
// Server Function check the session itself too.
export async function requireSession(): Promise<void> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  if (!(await isValidSession(cookieStore.get(SESSION_COOKIE)?.value))) {
    throw new Error("Not logged in");
  }
}

export async function isCorrectPassword(input: string): Promise<boolean> {
  // Hash both sides so the comparison doesn't leak the password's length.
  const [given, expected] = await Promise.all([
    hmac("password-check", input),
    hmac("password-check", appPassword()),
  ]);
  return safeEqual(given, expected);
}
