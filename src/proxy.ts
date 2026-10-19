import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, decryptSession } from "@/lib/session-token";
import { safeNext } from "@/lib/return-path";

export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/auth") || pathname === "/login") {
    return NextResponse.next();
  }

  const session = await decryptSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  const login = new URL("/login", request.url);
  const next = safeNext(`${pathname}${search}`);
  if (next !== "/") login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|svg|jpg|jpeg|gif|webp|ico)$).*)"],
};
