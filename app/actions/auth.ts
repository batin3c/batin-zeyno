"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/session";
import { getMembers, getPuzzlePattern } from "@/lib/dal";

const PUZZLE_OK_COOKIE = "baze_puzzle_ok";

function arraysEqual(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export type PuzzleResult =
  | { ok: true }
  | { ok: false; reason: "wrong" | "empty" };

export async function checkPuzzle(pattern: number[]): Promise<PuzzleResult> {
  if (!Array.isArray(pattern) || pattern.length === 0) {
    return { ok: false, reason: "empty" };
  }
  const expected = await getPuzzlePattern();
  if (!arraysEqual(pattern, expected)) {
    return { ok: false, reason: "wrong" };
  }
  const store = await cookies();
  store.set(PUZZLE_OK_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 120, // 2 minutes
  });
  return { ok: true };
}

export async function pickIdentity(formData: FormData) {
  const store = await cookies();
  const ok = store.get(PUZZLE_OK_COOKIE)?.value === "1";
  if (!ok) redirect("/puzzle");

  const memberId = String(formData.get("memberId") ?? "");
  const members = await getMembers();
  const member = members.find((m) => m.id === memberId);
  if (!member) redirect("/who");

  await createSession(member.id);
  store.delete(PUZZLE_OK_COOKIE);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/puzzle");
}
