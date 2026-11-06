import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/auth";

// Every page and API route requires the session cookie, except the login page
// and the reminder sender, which Supabase calls with its own secret.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/login" || pathname === "/api/reminders") return NextResponse.next();

  if (await isValidSession(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // The app icons show on the login page too, and on a phone's home screen.
  // The manifest and the service worker are fetched without the cookie.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|icon-192.png|icon-512.png|manifest.webmanifest|sw.js).*)"],
};
