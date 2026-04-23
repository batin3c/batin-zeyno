import { NextResponse, type NextRequest } from "next/server";
import { decryptFromToken, SESSION_COOKIE_NAME } from "@/lib/session";

const PUBLIC_PATHS = new Set(["/puzzle", "/who"]);

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
  const isPublic = PUBLIC_PATHS.has(pathname);

  if (!session && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/puzzle";
    return NextResponse.redirect(url);
  }

  if (session && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.png$|.*\\.svg$|.*\\.jpg$).*)"],
};
