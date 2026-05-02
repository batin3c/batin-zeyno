import { NextResponse, type NextRequest } from "next/server";
import { decryptFromToken, SESSION_COOKIE_NAME } from "@/lib/session";

// Pages anonymous visitors can reach.
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

  // No session → bounce protected paths to /giris.
  if (!session && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/giris";
    return NextResponse.redirect(url);
  }

  // Don't auto-bounce signed-in users away from /giris. If their cookie is
  // stale (memberId points to a deleted row, e.g. after a data wipe), pages
  // that requireCurrentMember will redirect them HERE — bouncing them back
  // to "/" would create an infinite loop. Letting /giris render lets them
  // sign in fresh; createSession overwrites the bad cookie.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.png$|.*\\.svg$|.*\\.jpg$).*)"],
};
