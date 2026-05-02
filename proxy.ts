import { NextResponse, type NextRequest } from "next/server";
import { decryptFromToken, SESSION_COOKIE_NAME } from "@/lib/session";

// no password gate — these pages are open to anyone (the rest of the app
// will redirect through to /pick-member if it can't find a member)
const PUBLIC_PATHS = new Set([
  "/pick-member",
  "/puzzle",
  "/yeni-grup",
  "/katil",
]);
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
    url.pathname = "/pick-member";
    return NextResponse.redirect(url);
  }

  // bounce already-signed-in users away from /pick-member — they don't need to
  // pick again. /yeni-grup and /katil stay reachable so they can create or
  // join more groups while signed in.
  if (
    session &&
    session.memberId &&
    session.activeGroupId &&
    pathname === "/pick-member"
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.png$|.*\\.svg$|.*\\.jpg$).*)"],
};
