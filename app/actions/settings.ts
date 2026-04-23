"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { requireCurrentMember, setPuzzlePattern } from "@/lib/dal";
import { uploadImage, removeByUrl } from "@/lib/storage";

export async function updateMemberName(formData: FormData) {
  await requireCurrentMember();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;
  const { error } = await db.from("members").update({ name }).eq("id", id);
  if (error) throw error;
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

export async function updateMemberAvatar(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  await requireCurrentMember();
  const id = String(formData.get("id") ?? "");
  const file = formData.get("file");
  if (!id || !(file instanceof File)) {
    return { ok: false, error: "istek bozuk" };
  }
  try {
    const { data: row } = await db
      .from("members")
      .select("avatar_url")
      .eq("id", id)
      .single();
    const old = row?.avatar_url as string | null | undefined;
    if (old && old.includes("/baze-media/")) {
      try {
        await removeByUrl(old);
      } catch {}
    }
    const url = await uploadImage(file, "avatars");
    const { error } = await db
      .from("members")
      .update({ avatar_url: url })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function savePuzzlePattern(
  pattern: number[]
): Promise<{ ok: boolean; error?: string }> {
  await requireCurrentMember();
  if (!Array.isArray(pattern) || pattern.length < 3) {
    return { ok: false, error: "en az 3 nokta çiz aq" };
  }
  if (!pattern.every((n) => Number.isInteger(n) && n >= 0 && n <= 8)) {
    return { ok: false, error: "desen anlamadım" };
  }
  await setPuzzlePattern(pattern);
  revalidatePath("/settings");
  return { ok: true };
}
