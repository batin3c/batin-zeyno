"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { requireCurrentMember } from "@/lib/dal";
import { notifyMembers } from "./push";
import type { Member } from "@/lib/types";

export async function toggleFollow(
  memberId: string
): Promise<{ ok: boolean; following?: boolean; error?: string }> {
  const me = await requireCurrentMember();
  if (!memberId) return { ok: false, error: "id yok" };
  if (memberId === me.id) return { ok: false, error: "kendini takip edemezsin" };

  const { data: existing } = await db
    .from("follows")
    .select("followed_id")
    .eq("follower_id", me.id)
    .eq("followed_id", memberId)
    .maybeSingle();
  if (existing) {
    const { error } = await db
      .from("follows")
      .delete()
      .eq("follower_id", me.id)
      .eq("followed_id", memberId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/u/${memberId}`);
    return { ok: true, following: false };
  }
  const { error } = await db
    .from("follows")
    .insert({ follower_id: me.id, followed_id: memberId });
  if (error) return { ok: false, error: error.message };

  notifyMembers([memberId], {
    title: `${me.name.toLowerCase()} seni takip etmeye başladı 👥`,
    body: "akışta artık paylaşımlarını görecek",
    url: `/u/${me.id}`,
    tag: `follow-${me.id}`,
  }).catch(() => {});

  revalidatePath(`/u/${memberId}`);
  return { ok: true, following: true };
}

export async function loadFollowing(
  memberId?: string
): Promise<Array<Pick<Member, "id" | "name" | "surname" | "color" | "bio">>> {
  const me = await requireCurrentMember();
  const target = memberId ?? me.id;
  const { data: rows } = await db
    .from("follows")
    .select("followed_id")
    .eq("follower_id", target);
  const ids = (rows ?? []).map((r) => r.followed_id as string);
  if (ids.length === 0) return [];
  const { data: members } = await db
    .from("members")
    .select("id, name, surname, color, bio")
    .in("id", ids);
  return (members ?? []) as Array<
    Pick<Member, "id" | "name" | "surname" | "color" | "bio">
  >;
}

export async function loadFollowers(
  memberId?: string
): Promise<Array<Pick<Member, "id" | "name" | "surname" | "color" | "bio">>> {
  const me = await requireCurrentMember();
  const target = memberId ?? me.id;
  const { data: rows } = await db
    .from("follows")
    .select("follower_id")
    .eq("followed_id", target);
  const ids = (rows ?? []).map((r) => r.follower_id as string);
  if (ids.length === 0) return [];
  const { data: members } = await db
    .from("members")
    .select("id, name, surname, color, bio")
    .in("id", ids);
  return (members ?? []) as Array<
    Pick<Member, "id" | "name" | "surname" | "color" | "bio">
  >;
}

export async function isFollowing(memberId: string): Promise<boolean> {
  const me = await requireCurrentMember();
  if (!memberId || memberId === me.id) return false;
  const { data } = await db
    .from("follows")
    .select("followed_id")
    .eq("follower_id", me.id)
    .eq("followed_id", memberId)
    .maybeSingle();
  return !!data;
}
