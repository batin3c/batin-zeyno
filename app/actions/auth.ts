"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, setActiveGroup } from "@/lib/session";
import {
  findMemberByPattern,
  hashPattern,
  requireCurrentMember,
} from "@/lib/dal";
import { db } from "@/lib/supabase";

export type PuzzleResult =
  | { ok: false; reason?: "wrong" | "empty" }
  | { ok: true; nextPath: string };

export async function checkPuzzle(pattern: number[]): Promise<PuzzleResult> {
  if (!Array.isArray(pattern) || pattern.length === 0) {
    return { ok: false, reason: "empty" };
  }
  const member = await findMemberByPattern(pattern);
  if (!member) {
    return { ok: false, reason: "wrong" };
  }

  // Find which groups this member belongs to
  const { data: links } = await db
    .from("group_members")
    .select("group_id")
    .eq("member_id", member.id);

  const groupIds = (links ?? [])
    .map((r) => (r as { group_id: string }).group_id)
    .filter(Boolean);

  if (groupIds.length === 0) {
    await createSession(member.id, null);
    return { ok: true, nextPath: "/yeni-grup" };
  }

  if (groupIds.length === 1) {
    await createSession(member.id, groupIds[0]);
    return { ok: true, nextPath: "/" };
  }

  await createSession(member.id, null);
  return { ok: true, nextPath: "/select-group" };
}

/**
 * Update the current member's pattern_hash. Used in settings when someone
 * wants to change their own pattern.
 */
export async function setMemberPattern(
  pattern: number[]
): Promise<{ ok: boolean; error?: string }> {
  if (!Array.isArray(pattern) || pattern.length < 3) {
    return { ok: false, error: "en az 3 nokta lan" };
  }
  const me = await requireCurrentMember();
  const hash = hashPattern(pattern);
  const { error } = await db
    .from("members")
    .update({ pattern_hash: hash })
    .eq("id", me.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Switch the current session to a different group the user belongs to.
 * Verifies membership server-side, then redirects home.
 */
export async function selectGroup(groupId: string) {
  const me = await requireCurrentMember();
  if (!groupId) redirect("/select-group");

  const { data: link } = await db
    .from("group_members")
    .select("member_id")
    .eq("group_id", groupId)
    .eq("member_id", me.id)
    .maybeSingle();

  if (!link) redirect("/select-group");

  await setActiveGroup(groupId);
  redirect("/");
}

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeInviteCode(): string {
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += INVITE_ALPHABET[Math.floor(Math.random() * INVITE_ALPHABET.length)];
  }
  return out;
}

/**
 * Create a new group, add the creator as the owner, set it as the active
 * session group, and redirect home.
 */
export async function createGroup(
  name: string,
  color: string
): Promise<{ ok: false; error: string } | never> {
  const me = await requireCurrentMember();
  const trimmed = (name ?? "").trim();
  if (!trimmed) return { ok: false, error: "isim boş olmaz" };
  if (trimmed.length > 60) {
    return { ok: false, error: "isim çok uzun (max 60)" };
  }
  const safeColor = (color ?? "").trim() || "#ff6b9d";

  // Try a few times in the unlikely event of an invite_code collision
  let groupId: string | null = null;
  let lastError: string | null = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = makeInviteCode();
    const { data, error } = await db
      .from("groups")
      .insert({
        name: trimmed,
        color: safeColor,
        invite_code: code,
        created_by: me.id,
      })
      .select("id")
      .single();
    if (!error && data?.id) {
      groupId = data.id as string;
      break;
    }
    lastError = error?.message ?? "bilinmeyen hata";
    // 23505 = unique_violation. retry on conflict, fail otherwise.
    if (error && (error as { code?: string }).code !== "23505") break;
  }

  if (!groupId) {
    return { ok: false, error: lastError ?? "grup oluşturulamadı" };
  }

  const { error: linkError } = await db.from("group_members").insert({
    group_id: groupId,
    member_id: me.id,
    role: "owner",
  });
  if (linkError) {
    return { ok: false, error: linkError.message };
  }

  await setActiveGroup(groupId);
  redirect("/");
}

/**
 * Join a group by invite code. Idempotent — already-a-member is treated as
 * success and just sets the group active.
 */
export async function joinGroup(
  inviteCode: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireCurrentMember();
  const code = (inviteCode ?? "").trim().toUpperCase();
  if (!code) return { ok: false, error: "kod yok" };

  const { data: group } = await db
    .from("groups")
    .select("id")
    .eq("invite_code", code)
    .maybeSingle();

  if (!group) return { ok: false, error: "kod yok" };
  const groupId = (group as { id: string }).id;

  const { data: existing } = await db
    .from("group_members")
    .select("member_id")
    .eq("group_id", groupId)
    .eq("member_id", me.id)
    .maybeSingle();

  if (!existing) {
    const { error: insertError } = await db.from("group_members").insert({
      group_id: groupId,
      member_id: me.id,
      role: "member",
    });
    if (insertError) return { ok: false, error: insertError.message };
  }

  await setActiveGroup(groupId);
  return { ok: true };
}

export async function logout() {
  await destroySession();
  redirect("/puzzle");
}
