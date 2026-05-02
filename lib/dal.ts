import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createHash } from "crypto";
import { readSession } from "./session";
import { db } from "./supabase";
import type { Member, Group } from "./types";

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
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Member[];
});

export const getCurrentMember = cache(async (): Promise<Member | null> => {
  const session = await getSession();
  if (!session?.memberId) return null;
  const { data, error } = await db
    .from("members")
    .select("*")
    .eq("id", session.memberId)
    .maybeSingle();
  if (error) return null;
  return (data as Member) ?? null;
});

export const requireCurrentMember = cache(async (): Promise<Member> => {
  const session = await getSession();
  if (!session) redirect("/puzzle");
  // pattern-matched a group but identity not picked yet
  if (!session.memberId && session.activeGroupId) redirect("/pick-member");
  const member = await getCurrentMember();
  if (!member) redirect("/puzzle");
  return member;
});

/**
 * Active group from session. Returns null if no group selected yet
 * (fresh login with multi-group, or new user with zero groups).
 */
export const getActiveGroupId = cache(async (): Promise<string | null> => {
  const session = await getSession();
  return session?.activeGroupId ?? null;
});

/**
 * Active group id, redirecting to group selection if missing. Use this in
 * server actions and pages that absolutely need a group context.
 */
export const requireActiveGroupId = cache(async (): Promise<string> => {
  const id = await getActiveGroupId();
  if (!id) redirect("/select-group");
  return id;
});

export const getCurrentGroup = cache(async (): Promise<Group | null> => {
  const id = await getActiveGroupId();
  if (!id) return null;
  const { data } = await db.from("groups").select("*").eq("id", id).maybeSingle();
  return (data as Group) ?? null;
});

/**
 * All groups the current member belongs to, ordered by join date (oldest first).
 */
export const getMemberGroups = cache(async (): Promise<Group[]> => {
  const session = await getSession();
  if (!session) return [];
  const { data, error } = await db
    .from("group_members")
    .select("group_id, joined_at, groups(*)")
    .eq("member_id", session.memberId)
    .order("joined_at", { ascending: true });
  if (error) return [];
  return (data ?? [])
    .map((r) => (r as unknown as { groups: Group }).groups)
    .filter((g): g is Group => g != null);
});

/**
 * Group members that the current member shares a group with — i.e. the
 * other people in this trip's group. Includes the current member.
 */
export const getActiveGroupMembers = cache(async (): Promise<Member[]> => {
  const groupId = await getActiveGroupId();
  if (!groupId) return [];
  const { data, error } = await db
    .from("group_members")
    .select("member_id, members(*)")
    .eq("group_id", groupId);
  if (error) return [];
  return (data ?? [])
    .map((r) => (r as unknown as { members: Member }).members)
    .filter((m): m is Member => m != null && m.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
});

// ---------- pattern hash + lookup ----------

/**
 * Hash a puzzle pattern with the SESSION_SECRET as salt. Patterns are short
 * (3-9 dots), so plain hash is acceptable for the trusted-circle threat model;
 * the salt prevents naive rainbow lookups against the DB column.
 */
export function hashPattern(pattern: number[]): string {
  const secret = process.env.SESSION_SECRET ?? "";
  return createHash("sha256")
    .update(JSON.stringify(pattern) + ":" + secret)
    .digest("hex");
}

/**
 * Find the (active) member whose stored pattern_hash matches this attempt.
 * Returns null if no match — the caller should treat that as wrong pattern.
 */
export async function findMemberByPattern(
  pattern: number[]
): Promise<Member | null> {
  if (!Array.isArray(pattern) || pattern.length < 3) return null;
  const hash = hashPattern(pattern);
  const { data } = await db
    .from("members")
    .select("*")
    .eq("pattern_hash", hash)
    .eq("is_active", true)
    .maybeSingle();
  return (data as Member) ?? null;
}

// ---------- legacy puzzle helpers (kept for /setup migration) ----------

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
