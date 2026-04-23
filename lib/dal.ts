import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSession } from "./session";
import { db } from "./supabase";
import type { Member } from "./types";

export const getSession = cache(async () => {
  return readSession();
});

export const requireSession = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/puzzle");
  return session;
});

export const getMembers = cache(async (): Promise<Member[]> => {
  const { data, error } = await db
    .from("members")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Member[];
});

export const getCurrentMember = cache(async (): Promise<Member | null> => {
  const session = await getSession();
  if (!session) return null;
  const members = await getMembers();
  return members.find((m) => m.id === session.memberId) ?? null;
});

export const requireCurrentMember = cache(async (): Promise<Member> => {
  const member = await getCurrentMember();
  if (!member) redirect("/puzzle");
  return member;
});

export async function getPuzzlePattern(): Promise<number[]> {
  const { data, error } = await db
    .from("app_config")
    .select("value")
    .eq("key", "puzzle_pattern")
    .single();
  if (error) throw error;
  const value = data?.value;
  if (!Array.isArray(value)) return [];
  return value.filter((n) => typeof n === "number");
}

export async function setPuzzlePattern(pattern: number[]) {
  const { error } = await db.from("app_config").upsert({
    key: "puzzle_pattern",
    value: pattern,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
