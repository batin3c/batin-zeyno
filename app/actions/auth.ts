"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, setActiveGroup } from "@/lib/session";
import { requireCurrentMember, getCurrentMember } from "@/lib/dal";
import { db } from "@/lib/supabase";

/**
 * Create a brand-new account (member row) and sign in as it. No group is
 * attached — the new account lands on /yeni-grup so they can either create
 * a group or paste an invite code.
 *
 * Note: name-based sign-in has been removed. Returning users on a new
 * device must come back via an invite code (see `joinGroup`). Real email
 * magic-link auth lands in a later phase.
 */
export async function createAccount(name: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return { ok: false, error: "adın boş" };
  if (trimmed.length > 40) return { ok: false, error: "ad çok uzun" };

  const baseHandle =
    trimmed
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w]+/g, "_")
      .slice(0, 30) || "uye";

  // handles must be unique — append a numeric suffix if needed
  let handle = baseHandle;
  for (let i = 0; i < 25; i++) {
    const { data: clash } = await db
      .from("members")
      .select("id")
      .eq("handle", handle)
      .maybeSingle();
    if (!clash) break;
    handle = `${baseHandle}_${Math.floor(Math.random() * 10000)}`;
  }

  const { data, error } = await db
    .from("members")
    .insert({ name: trimmed, handle, is_active: true })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "üye oluşturulamadı" };
  }
  const memberId = (data as { id: string }).id;

  await createSession(memberId, null);
  redirect("/yeni-grup");
}

/**
 * Switch the current session to a different group the user belongs to.
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
 * Create a new group. Anonymous-friendly: if no current member, a new one
 * is created from `memberName`.
 */
export async function createGroup(input: {
  name: string;
  color: string;
  memberName?: string;
}): Promise<{ ok: false; error: string } | never> {
  const trimmedName = (input.name ?? "").trim();
  if (!trimmedName) return { ok: false, error: "grup ismi boş" };
  if (trimmedName.length > 60) return { ok: false, error: "grup ismi çok uzun" };
  const safeColor = (input.color ?? "").trim() || "#ff6b9d";

  const existingMe = await getCurrentMember();
  let ownerId: string;
  if (existingMe) {
    ownerId = existingMe.id;
  } else {
    const memberName = (input.memberName ?? "").trim();
    if (!memberName) return { ok: false, error: "adın boş" };
    const handle =
      memberName
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
 * Join a group by invite code. Anonymous-friendly.
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
    const handle =
      memberName
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

export async function logout() {
  await destroySession();
  redirect("/pick-member");
}
