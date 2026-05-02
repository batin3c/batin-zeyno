"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, setActiveGroup } from "@/lib/session";
import {
  hashPattern,
  requireCurrentMember,
  getCurrentMember,
  getSession,
} from "@/lib/dal";
import { db } from "@/lib/supabase";

export type PuzzleResult =
  | { ok: false; reason?: "wrong" | "empty" }
  | { ok: true; nextPath: string };

/**
 * The drawn pattern identifies a GROUP (not a member). On match we set the
 * session's activeGroupId — but leave memberId null until the user picks
 * their identity on /pick-member.
 */
export async function checkPuzzle(pattern: number[]): Promise<PuzzleResult> {
  if (!Array.isArray(pattern) || pattern.length === 0) {
    return { ok: false, reason: "empty" };
  }
  const hash = hashPattern(pattern);
  const { data: group } = await db
    .from("groups")
    .select("id")
    .eq("pattern_hash", hash)
    .maybeSingle();
  if (!group) return { ok: false, reason: "wrong" };

  // memberId stays null — /pick-member will set it after the user clicks
  await createSession(null, (group as { id: string }).id);
  return { ok: true, nextPath: "/pick-member" };
}

/**
 * Second step of the login flow: pick which member of the active group you
 * are. Only callable after `checkPuzzle` set activeGroupId.
 */
export async function pickMember(memberId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const session = await getSession();
  if (!session?.activeGroupId) return { ok: false, error: "grup yok" };
  if (!memberId) return { ok: false, error: "üye yok" };

  // verify memberId is in this group
  const { data: link } = await db
    .from("group_members")
    .select("member_id")
    .eq("group_id", session.activeGroupId)
    .eq("member_id", memberId)
    .maybeSingle();
  if (!link) return { ok: false, error: "üye bu grupta değil" };

  await createSession(memberId, session.activeGroupId);
  redirect("/");
}

/**
 * One-shot, anonymous-accessible setup for a group whose pattern_hash is NULL.
 * Used during the legacy → group-pattern migration: the user opens a link
 * keyed by group id, draws a pattern, picks which existing member they are,
 * and the action sets the pattern + session in one go.
 */
export async function setupGroup(input: {
  groupId: string;
  pattern: number[];
  memberId: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!input.groupId) return { ok: false, error: "grup yok" };
  if (!Array.isArray(input.pattern) || input.pattern.length < 3) {
    return { ok: false, error: "en az 3 nokta" };
  }
  if (!input.memberId) return { ok: false, error: "üye seç" };

  // group must exist AND pattern_hash must currently be NULL
  const { data: group } = await db
    .from("groups")
    .select("id, pattern_hash")
    .eq("id", input.groupId)
    .maybeSingle();
  if (!group) return { ok: false, error: "grup yok" };
  if ((group as { pattern_hash: string | null }).pattern_hash) {
    return { ok: false, error: "bu grubun şifresi zaten ayarlanmış" };
  }

  // member must exist + be in this group
  const { data: link } = await db
    .from("group_members")
    .select("member_id")
    .eq("group_id", input.groupId)
    .eq("member_id", input.memberId)
    .maybeSingle();
  if (!link) return { ok: false, error: "üye bu grupta değil" };

  const hash = hashPattern(input.pattern);
  // collision check
  const { data: existing } = await db
    .from("groups")
    .select("id")
    .eq("pattern_hash", hash)
    .maybeSingle();
  if (existing && (existing as { id: string }).id !== input.groupId) {
    return { ok: false, error: "bu desen başka grupta" };
  }

  const { error } = await db
    .from("groups")
    .update({ pattern_hash: hash })
    .eq("id", input.groupId);
  if (error) return { ok: false, error: error.message };

  await createSession(input.memberId, input.groupId);
  return { ok: true };
}

/**
 * Owner-only: change the active group's pattern. The new hash must not
 * collide with any other group's pattern.
 */
export async function changeGroupPattern(
  pattern: number[]
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireCurrentMember();
  const session = await getSession();
  if (!session?.activeGroupId) return { ok: false, error: "grup yok" };
  if (!Array.isArray(pattern) || pattern.length < 3) {
    return { ok: false, error: "en az 3 nokta" };
  }

  // owner check
  const { data: link } = await db
    .from("group_members")
    .select("role")
    .eq("group_id", session.activeGroupId)
    .eq("member_id", me.id)
    .maybeSingle();
  if ((link as { role?: string } | null)?.role !== "owner") {
    return { ok: false, error: "sadece owner değiştirebilir" };
  }

  const hash = hashPattern(pattern);
  // collision: any other group with this hash?
  const { data: existing } = await db
    .from("groups")
    .select("id")
    .eq("pattern_hash", hash)
    .maybeSingle();
  if (existing && (existing as { id: string }).id !== session.activeGroupId) {
    return { ok: false, error: "bu desen başka grupta" };
  }

  const { error } = await db
    .from("groups")
    .update({ pattern_hash: hash })
    .eq("id", session.activeGroupId);
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
 * Create a new group with its own pattern + first member. Anonymous-friendly
 * for fresh accounts. If the caller already has a session + member, that
 * member becomes the owner; otherwise a brand-new member is created from
 * `memberName`.
 */
export async function createGroup(input: {
  name: string;
  color: string;
  pattern: number[];
  memberName?: string;
}): Promise<{ ok: false; error: string } | never> {
  const trimmedName = (input.name ?? "").trim();
  if (!trimmedName) return { ok: false, error: "grup ismi boş" };
  if (trimmedName.length > 60) return { ok: false, error: "grup ismi çok uzun" };
  if (!Array.isArray(input.pattern) || input.pattern.length < 3) {
    return { ok: false, error: "en az 3 nokta" };
  }
  const safeColor = (input.color ?? "").trim() || "#ff6b9d";

  // resolve the owner-to-be
  const existingMe = await getCurrentMember();
  let ownerId: string;
  if (existingMe) {
    ownerId = existingMe.id;
  } else {
    const memberName = (input.memberName ?? "").trim();
    if (!memberName) return { ok: false, error: "adın boş" };
    const handle = memberName
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w]+/g, "_")
      .slice(0, 30) || "uye";
    const { data: newMember, error: memberErr } = await db
      .from("members")
      .insert({ name: memberName, handle, is_active: true })
      .select("id")
      .single();
    if (memberErr || !newMember) {
      return { ok: false, error: memberErr?.message ?? "üye oluşturulamadı" };
    }
    ownerId = (newMember as { id: string }).id;
  }

  const patternHash = hashPattern(input.pattern);
  // pattern collision check
  const { data: dupe } = await db
    .from("groups")
    .select("id")
    .eq("pattern_hash", patternHash)
    .maybeSingle();
  if (dupe) return { ok: false, error: "bu desen başka grupta" };

  let groupId: string | null = null;
  let lastError: string | null = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = makeInviteCode();
    const { data, error } = await db
      .from("groups")
      .insert({
        name: trimmedName,
        color: safeColor,
        invite_code: code,
        pattern_hash: patternHash,
        created_by: ownerId,
      })
      .select("id")
      .single();
    if (!error && data?.id) {
      groupId = (data as { id: string }).id;
      break;
    }
    lastError = error?.message ?? "bilinmeyen hata";
    if (error && (error as { code?: string }).code !== "23505") break;
  }
  if (!groupId) return { ok: false, error: lastError ?? "grup oluşturulamadı" };

  const { error: linkError } = await db.from("group_members").insert({
    group_id: groupId,
    member_id: ownerId,
    role: "owner",
  });
  if (linkError) return { ok: false, error: linkError.message };

  await createSession(ownerId, groupId);
  redirect("/");
}

/**
 * Join a group by invite code. The caller can be anonymous: if no current
 * member, a brand-new one is created from `memberName` and added to the group.
 */
export async function joinGroup(input: {
  inviteCode: string;
  memberName?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const code = (input.inviteCode ?? "").trim().toUpperCase();
  if (!code) return { ok: false, error: "kod yok" };

  const { data: group } = await db
    .from("groups")
    .select("id")
    .eq("invite_code", code)
    .maybeSingle();
  if (!group) return { ok: false, error: "kod yok" };
  const groupId = (group as { id: string }).id;

  const existingMe = await getCurrentMember();
  let memberId: string;
  if (existingMe) {
    memberId = existingMe.id;
  } else {
    const memberName = (input.memberName ?? "").trim();
    if (!memberName) return { ok: false, error: "adın boş" };
    const handle = memberName
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w]+/g, "_")
      .slice(0, 30) || "uye";
    const { data: newMember, error: memberErr } = await db
      .from("members")
      .insert({ name: memberName, handle, is_active: true })
      .select("id")
      .single();
    if (memberErr || !newMember) {
      return { ok: false, error: memberErr?.message ?? "üye oluşturulamadı" };
    }
    memberId = (newMember as { id: string }).id;
  }

  // upsert membership
  const { data: existing } = await db
    .from("group_members")
    .select("member_id")
    .eq("group_id", groupId)
    .eq("member_id", memberId)
    .maybeSingle();
  if (!existing) {
    const { error: insertError } = await db.from("group_members").insert({
      group_id: groupId,
      member_id: memberId,
      role: "member",
    });
    if (insertError) return { ok: false, error: insertError.message };
  }

  await createSession(memberId, groupId);
  return { ok: true };
}

/**
 * Update the current member's display name / pattern (legacy; kept for
 * settings even though pattern is now group-scoped). The pattern path is
 * deprecated — use `changeGroupPattern` for the new behavior.
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

export async function logout() {
  await destroySession();
  redirect("/puzzle");
}
