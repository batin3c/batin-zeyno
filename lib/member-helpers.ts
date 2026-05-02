import "server-only";
import { db } from "./supabase";

export type CreateMemberResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * Insert a new `members` row from a display name. Generates a unique handle
 * by ASCII-folding the name and appending a numeric suffix on collision.
 * Trims & validates length but does NOT create a session — caller decides.
 */
export async function createMember(name: string): Promise<CreateMemberResult> {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return { ok: false, error: "ad boş" };
  if (trimmed.length > 40) return { ok: false, error: "ad çok uzun" };

  const baseHandle =
    trimmed
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w]+/g, "_")
      .slice(0, 30) || "uye";

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
  return { ok: true, id: (data as { id: string }).id };
}
