import { NextResponse, type NextRequest } from "next/server";
import { decryptFromToken, SESSION_COOKIE_NAME } from "@/lib/session";

// pages anonymous visitors can reach: /giris (login + signup), /katil/[code]
// (invite landing — confirms group, then bounces to /giris if no session)
const PUBLIC_PATHS = new Set(["/giris", "/pick-member", "/puzzle", "/katil"]);
const PUBLIC_PREFIXES = ["/katil/", "/grup-kur/"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/avatars") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.json" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await decryptFromToken(token);
  const isPublic =
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (!session && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/giris";
    return NextResponse.redirect(url);
  }

  // bounce already-signed-in users away from /giris — no need to log in again
  if (session?.memberId && (pathname === "/giris" || pathname === "/pick-member")) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.png$|.*\\.svg$|.*\\.jpg$).*)"],
};
