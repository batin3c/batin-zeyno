"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { requireCurrentMember } from "@/lib/dal";

export async function updateBio(
  bio: string | null
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireCurrentMember();
  const clean = typeof bio === "string" ? bio.trim() : "";
  if (clean.length > 200) return { ok: false, error: "bio çok uzun (max 200)" };
  const { error } = await db
    .from("members")
    .update({ bio: clean.length > 0 ? clean : null })
    .eq("id", me.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/profil");
  revalidatePath(`/u/${me.id}`);
  return { ok: true };
}
