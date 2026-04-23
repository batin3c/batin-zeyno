import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { SessionPayload } from "./types";

const SESSION_COOKIE = "baze_session";
const SESSION_DAYS = 30;

function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET missing. Generate one with: openssl rand -base64 32"
    );
  }
  return new TextEncoder().encode(secret);
}

async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getKey());
}

async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getKey(), {
      algorithms: ["HS256"],
    });
    if (
      typeof payload.memberId === "string" &&
      typeof payload.expiresAt === "number"
    ) {
      return {
        memberId: payload.memberId,
        expiresAt: payload.expiresAt,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function createSession(memberId: string) {
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const token = await encrypt({ memberId, expiresAt });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await decrypt(token);
  if (!payload) return null;
  if (payload.expiresAt < Date.now()) return null;
  return payload;
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// used by proxy.ts which runs on the edge and can only read the raw cookie
export async function decryptFromToken(token: string | undefined) {
  if (!token) return null;
  const payload = await decrypt(token);
  if (!payload) return null;
  if (payload.expiresAt < Date.now()) return null;
  return payload;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
