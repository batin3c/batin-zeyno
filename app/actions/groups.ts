"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { requireCurrentMember, requireActiveGroupId } from "@/lib/dal";
import { setActiveGroup } from "@/lib/session";
import { makeInviteCode } from "@/lib/invite";

export async function createGroup(
  name: string,
  color: string
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const me = await requireCurrentMember();
  const trimmed = (name ?? "").trim();
  if (!trimmed) return { ok: false, error: "isim boş" };
  if (trimmed.length > 60) return { ok: false, error: "isim çok uzun" };
  // retry on invite_code collision (very rare)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeInviteCode();
    const { data, error } = await db
      .from("groups")
      .insert({
        name: trimmed,
        color: color || null,
        invite_code: code,
        created_by: me.id,
      })
      .select("id")
      .single();
    if (error?.code === "23505") continue; // unique violation, retry
    if (error) return { ok: false, error: error.message };
    const newId = data.id as string;
    await db.from("group_members").insert({
      group_id: newId,
      member_id: me.id,
      role: "owner",
    });
    await setActiveGroup(newId);
    revalidatePath("/", "layout");
    return { ok: true, id: newId };
  }
  return { ok: false, error: "kod üretilemedi, tekrar dene" };
}

export async function joinGroupByCode(
  code: string
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const me = await requireCurrentMember();
  const c = (code ?? "").trim().toUpperCase();
  if (!c) return { ok: false, error: "kod yok" };
  const { data: group } = await db
    .from("groups")
    .select("id")
    .eq("invite_code", c)
    .maybeSingle();
  if (!group) return { ok: false, error: "böyle bir grup yok" };
  await db.from("group_members").upsert(
    {
      group_id: group.id,
      member_id: me.id,
      role: "member",
    },
    { onConflict: "group_id,member_id" }
  );
  await setActiveGroup(group.id);
  revalidatePath("/", "layout");
  return { ok: true, id: group.id };
}

export async function switchGroup(
  groupId: string
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireCurrentMember();
  // verify membership
  const { data } = await db
    .from("group_members")
    .select("member_id")
    .eq("group_id", groupId)
    .eq("member_id", me.id)
    .maybeSingle();
  if (!data) return { ok: false, error: "üye değilsin" };
  await setActiveGroup(groupId);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function leaveGroup(
  groupId: string
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireCurrentMember();
  // can't leave if you're the only owner; if you're an owner, must transfer or delete
  const { data: members } = await db
    .from("group_members")
    .select("member_id, role")
    .eq("group_id", groupId);
  const list = (members ?? []) as { member_id: string; role: string }[];
  const me_member = list.find((m) => m.member_id === me.id);
  if (!me_member) return { ok: false, error: "üye değilsin" };
  const owners = list.filter((m) => m.role === "owner");
  if (me_member.role === "owner" && owners.length === 1 && list.length > 1) {
    return { ok: false, error: "tek owner sensin, önce başkasını owner yap" };
  }
  // if you're the last member overall, delete the group entirely (cascades data)
  if (list.length === 1) {
    await db.from("groups").delete().eq("id", groupId);
  } else {
    await db
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("member_id", me.id);
  }
  // pick another active group if active was this one
  const currentActive = await requireActiveGroupId().catch(() => null);
  if (currentActive === groupId) {
    const { data: remaining } = await db
      .from("group_members")
      .select("group_id")
      .eq("member_id", me.id)
      .limit(1)
      .maybeSingle();
    await setActiveGroup(remaining?.group_id ?? null);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function kickMember(
  groupId: string,
  memberId: string
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireCurrentMember();
  if (memberId === me.id) return { ok: false, error: "kendini at-amazsın" };
  // me must be owner of this group
  const { data: meRow } = await db
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("member_id", me.id)
    .maybeSingle();
  if (meRow?.role !== "owner")
    return { ok: false, error: "sadece owner çıkarabilir" };
  await db
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("member_id", memberId);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function promoteMember(
  groupId: string,
  memberId: string
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireCurrentMember();
  const { data: meRow } = await db
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("member_id", me.id)
    .maybeSingle();
  if (meRow?.role !== "owner") return { ok: false, error: "yetkin yok" };
  await db
    .from("group_members")
    .update({ role: "owner" })
    .eq("group_id", groupId)
    .eq("member_id", memberId);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function regenerateInviteCode(
  groupId: string
): Promise<{ ok: boolean; code?: string; error?: string }> {
  const me = await requireCurrentMember();
  const { data: meRow } = await db
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("member_id", me.id)
    .maybeSingle();
  if (meRow?.role !== "owner") return { ok: false, error: "yetkin yok" };
  for (let i = 0; i < 5; i++) {
    const code = makeInviteCode();
    const { error } = await db
      .from("groups")
      .update({ invite_code: code })
      .eq("id", groupId);
    if (error?.code === "23505") continue;
    if (error) return { ok: false, error: error.message };
    revalidatePath("/", "layout");
    return { ok: true, code };
  }
  return { ok: false, error: "tekrar dene" };
}

export async function updateGroup(
  groupId: string,
  patch: { name?: string; color?: string }
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireCurrentMember();
  const { data: meRow } = await db
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("member_id", me.id)
    .maybeSingle();
  if (meRow?.role !== "owner") return { ok: false, error: "yetkin yok" };
  const update: Record<string, string | null> = {};
  if (typeof patch.name === "string") {
    const t = patch.name.trim();
    if (!t) return { ok: false, error: "isim boş" };
    if (t.length > 60) return { ok: false, error: "isim çok uzun" };
    update.name = t;
  }
  if (typeof patch.color === "string") update.color = patch.color || null;
  if (Object.keys(update).length === 0) return { ok: true };
  const { error } = await db.from("groups").update(update).eq("id", groupId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
