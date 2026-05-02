"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { requireCurrentMember } from "@/lib/dal";
import { uploadImage, removeByUrl } from "@/lib/storage";

export async function updateMemberName(formData: FormData) {
  const me = await requireCurrentMember();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const { error } = await db.from("members").update({ name }).eq("id", me.id);
  if (error) throw error;
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

export async function updateMemberAvatar(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireCurrentMember();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "istek bozuk" };
  }
  try {
    const { data: row } = await db
      .from("members")
      .select("avatar_url")
      .eq("id", me.id)
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
      .eq("id", me.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
