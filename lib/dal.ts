import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSession } from "./session";
import { db } from "./supabase";
import type { Member, Group } from "./types";

export const getSession = cache(async () => {
  return readSession();
});

export const requireSession = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/pick-member");
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
  const member = await getCurrentMember();
  if (!member) redirect("/pick-member");
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

