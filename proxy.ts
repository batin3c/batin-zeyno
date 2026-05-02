import { NextResponse, type NextRequest } from "next/server";
import { decryptFromToken, SESSION_COOKIE_NAME } from "@/lib/session";

// pages that anonymous visitors must be able to reach: puzzle (login),
// yeni-grup + katil (signup paths), grup-kur (one-shot legacy setup)
const PUBLIC_PATHS = new Set(["/puzzle", "/yeni-grup", "/katil"]);
const PUBLIC_PREFIXES = ["/katil/", "/grup-kur/", "/pick-member"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // skip static / next internals / api (api routes handle their own auth)
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
    url.pathname = "/puzzle";
    return NextResponse.redirect(url);
  }

  // signed-in user re-hits /puzzle → bounce home, but NOT for the other
  // public pages (a logged-in user can still want /yeni-grup, /katil/*)
  if (session && session.memberId && pathname === "/puzzle") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.png$|.*\\.svg$|.*\\.jpg$).*)"],
};
