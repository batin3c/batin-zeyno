"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { requireCurrentMember } from "@/lib/dal";
import { uploadImage, removeByUrl } from "@/lib/storage";

function normCode(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(s) ? s : null;
}

export async function toggleVisitedCountry(
  code: string
): Promise<{ ok: boolean; visited: boolean; error?: string }> {
  const me = await requireCurrentMember();
  const c = normCode(code);
  if (!c) return { ok: false, visited: false, error: "geçersiz kod" };

  const { data: existing, error: selErr } = await db
    .from("visited_countries")
    .select("code")
    .eq("code", c)
    .maybeSingle();
  if (selErr) return { ok: false, visited: false, error: selErr.message };

  if (existing) {
    // grab photos first for storage cleanup, then delete row (cascade handles photo rows)
    const { data: photos } = await db
      .from("country_photos")
      .select("url")
      .eq("code", c);
    const { error } = await db.from("visited_countries").delete().eq("code", c);
    if (error) return { ok: false, visited: false, error: error.message };
    for (const p of (photos ?? []) as { url: string }[]) {
      try {
        await removeByUrl(p.url);
      } catch {}
    }
    revalidatePath("/globe");
  revalidatePath("/");
    return { ok: true, visited: false };
  }

  const { error } = await db.from("visited_countries").insert({
    code: c,
    added_by: me.id,
  });
  if (error) return { ok: false, visited: false, error: error.message };
  revalidatePath("/globe");
  revalidatePath("/");
  return { ok: true, visited: true };
}

export async function updateCountryNote(
  code: string,
  note: string | null
): Promise<{ ok: boolean; error?: string }> {
  await requireCurrentMember();
  const c = normCode(code);
  if (!c) return { ok: false, error: "geçersiz kod" };
  const clean =
    typeof note === "string" && note.trim().length > 0 ? note.trim() : null;
  const { error } = await db
    .from("visited_countries")
    .update({ note: clean, updated_at: new Date().toISOString() })
    .eq("code", c);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/globe");
  revalidatePath("/");
  return { ok: true };
}

export async function addCountryPhoto(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireCurrentMember();
  const code = normCode(formData.get("code"));
  const file = formData.get("file");
  if (!code || !(file instanceof File)) {
    return { ok: false, error: "istek bozuk" };
  }
  try {
    // ensure visited row exists (photo FK requires it)
    const { data: existing } = await db
      .from("visited_countries")
      .select("code")
      .eq("code", code)
      .maybeSingle();
    if (!existing) {
      const { error: insErr } = await db
        .from("visited_countries")
        .insert({ code, added_by: me.id });
      if (insErr) return { ok: false, error: insErr.message };
    }

    const url = await uploadImage(file, `countries/${code}`);
    const { error } = await db.from("country_photos").insert({
      code,
      url,
      added_by: me.id,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/globe");
  revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function removeCountryPhotosBulk(
  ids: string[]
): Promise<{ ok: boolean; error?: string }> {
  await requireCurrentMember();
  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, error: "boş istek" };
  }
  const { data: rows } = await db
    .from("country_photos")
    .select("id, url")
    .in("id", ids);
  const { error } = await db
    .from("country_photos")
    .delete()
    .in("id", ids);
  if (error) return { ok: false, error: error.message };
  await Promise.allSettled(
    (rows ?? []).map((r: { url: string }) => removeByUrl(r.url))
  );
  revalidatePath("/globe");
  revalidatePath("/");
  return { ok: true };
}

export async function removeCountryPhoto(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  await requireCurrentMember();
  if (!id) return { ok: false, error: "id yok" };
  const { data: row } = await db
    .from("country_photos")
    .select("url")
    .eq("id", id)
    .single();
  const { error } = await db.from("country_photos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  if (row?.url) {
    try {
      await removeByUrl(row.url);
    } catch {}
  }
  revalidatePath("/globe");
  revalidatePath("/");
  return { ok: true };
}
