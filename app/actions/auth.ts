"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, setActiveGroup } from "@/lib/session";
import { requireCurrentMember } from "@/lib/dal";
import { db } from "@/lib/supabase";
import { hashPassword, verifyPassword } from "@/lib/password";
import { makeInviteCode } from "@/lib/invite";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

function clean(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
}

/**
 * Brand-new account: email + password + name + surname.
 * On success, sets the session and redirects to /yeni-grup so the new user
 * can either spin up a group or paste an invite code.
 */
export async function signUp(input: {
  email: string;
  password: string;
  name: string;
  surname: string;
}): Promise<{ ok: false; error: string } | never> {
  const email = clean(input.email).toLowerCase();
  const password = typeof input.password === "string" ? input.password : "";
  const name = clean(input.name);
  const surname = clean(input.surname);

  if (!EMAIL_RE.test(email)) return { ok: false, error: "geçersiz e-posta" };
  if (password.length < MIN_PASSWORD) {
    return { ok: false, error: `şifre en az ${MIN_PASSWORD} karakter` };
  }
  if (!name) return { ok: false, error: "isim boş" };
  if (name.length > 40) return { ok: false, error: "isim çok uzun" };
  if (!surname) return { ok: false, error: "soyisim boş" };
  if (surname.length > 40) return { ok: false, error: "soyisim çok uzun" };

  // case-insensitive email uniqueness via the lower(email) unique index
  const { data: clash } = await db
    .from("members")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (clash) return { ok: false, error: "bu e-posta zaten kayıtlı" };

  const password_hash = hashPassword(password);
  const { data, error } = await db
    .from("members")
    .insert({
      email,
      password_hash,
      name,
      surname,
      is_active: true,
    })
    .select("id")
    .single();
  if (error || !data) {
    // race on the unique index → caught here
    if ((error as { code?: string } | null)?.code === "23505") {
      return { ok: false, error: "bu e-posta zaten kayıtlı" };
    }
    return { ok: false, error: error?.message ?? "hesap oluşturulamadı" };
  }
  const memberId = (data as { id: string }).id;
  await createSession(memberId, null);
  redirect("/yeni-grup");
}

/**
 * Sign in: email + password. Active-group is auto-set to the user's first
 * group (oldest joined) so they land somewhere; if they have no groups yet,
 * goes to /yeni-grup.
 */
export async function signIn(input: {
  email: string;
  password: string;
}): Promise<{ ok: false; error: string } | never> {
  const email = clean(input.email).toLowerCase();
  const password = typeof input.password === "string" ? input.password : "";
  if (!EMAIL_RE.test(email) || password.length === 0) {
    return { ok: false, error: "e-posta veya şifre yanlış" };
  }

  const { data } = await db
    .from("members")
    .select("id, password_hash, is_active")
    .ilike("email", email)
    .maybeSingle();

  // generic error for both "no such user" and "wrong password" — don't leak
  // which emails exist
  if (!data || !data.is_active) {
    return { ok: false, error: "e-posta veya şifre yanlış" };
  }
  const row = data as { id: string; password_hash: string; is_active: boolean };
  if (!verifyPassword(password, row.password_hash)) {
    return { ok: false, error: "e-posta veya şifre yanlış" };
  }

  const { data: link } = await db
    .from("group_members")
    .select("group_id")
    .eq("member_id", row.id)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const activeGroupId = (link as { group_id?: string } | null)?.group_id ?? null;
  await createSession(row.id, activeGroupId);
  redirect(activeGroupId ? "/" : "/yeni-grup");
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

/**
 * Create a new group. Requires an authenticated session — anonymous group
 * creation is gone now that auth is real.
 */
export async function createGroup(input: {
  name: string;
  color: string;
}): Promise<{ ok: false; error: string } | never> {
  const me = await requireCurrentMember();
  const trimmedName = clean(input.name);
  if (!trimmedName) return { ok: false, error: "grup ismi boş" };
  if (trimmedName.length > 60) return { ok: false, error: "grup ismi çok uzun" };
  const safeColor = clean(input.color) || "#ff6b9d";

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
        created_by: me.id,
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
    member_id: me.id,
    role: "owner",
  });
  if (linkError) return { ok: false, error: linkError.message };

  await setActiveGroup(groupId);
  redirect("/");
}

/**
 * Join a group by invite code. Requires an authenticated session.
 */
export async function joinGroup(input: {
  inviteCode: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireCurrentMember();
  const code = clean(input.inviteCode).toUpperCase();
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
  redirect("/giris");
}
