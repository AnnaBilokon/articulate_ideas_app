import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/auth";

// Every page and API route requires the session cookie, except the login page.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/login") return NextResponse.next();

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
