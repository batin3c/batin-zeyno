"use server";

import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/lib/supabase";
import { requireCurrentMember, requireActiveGroupId } from "@/lib/dal";
import { uploadImage, removeByUrl } from "@/lib/storage";
import { iso2 } from "@/lib/form-helpers";

// invalidate just this group's globe-data cache (matches the tag set in
// app/layout.tsx: `globe-data:${groupId}`). Other groups' caches stay warm.
const bustGlobe = (groupId: string) => updateTag(`globe-data:${groupId}`);

export async function toggleVisitedCountry(
  code: string
): Promise<{ ok: boolean; visited: boolean; error?: string }> {
  const me = await requireCurrentMember();
  const groupId = await requireActiveGroupId();
  const c = iso2(code);
  if (!c) return { ok: false, visited: false, error: "geçersiz kod" };

  const { data: existing, error: selErr } = await db
    .from("visited_countries")
    .select("code")
    .eq("group_id", groupId)
    .eq("code", c)
    .maybeSingle();
  if (selErr) return { ok: false, visited: false, error: selErr.message };

  if (existing) {
    const { data: photos } = await db
      .from("country_photos")
      .select("url")
      .eq("group_id", groupId)
      .eq("code", c);
    const { error } = await db
      .from("visited_countries")
      .delete()
      .eq("group_id", groupId)
      .eq("code", c);
    if (error) return { ok: false, visited: false, error: error.message };
    await Promise.allSettled(
      ((photos ?? []) as { url: string }[]).map((p) => removeByUrl(p.url))
    );
    bustGlobe(groupId);
    revalidatePath("/tatiller"); // country count changed → home stats
    return { ok: true, visited: false };
  }

  const { error } = await db.from("visited_countries").insert({
    code: c,
    added_by: me.id,
    group_id: groupId,
  });
  if (error) return { ok: false, visited: false, error: error.message };
  bustGlobe(groupId);
  revalidatePath("/tatiller"); // country count changed → home stats
  return { ok: true, visited: true };
}

export async function updateCountryNote(
  code: string,
  note: string | null
): Promise<{ ok: boolean; error?: string }> {
  await requireCurrentMember();
  const groupId = await requireActiveGroupId();
  const c = iso2(code);
  if (!c) return { ok: false, error: "geçersiz kod" };
  const clean =
    typeof note === "string" && note.trim().length > 0 ? note.trim() : null;
  const { error } = await db
    .from("visited_countries")
    .update({ note: clean, updated_at: new Date().toISOString() })
    .eq("group_id", groupId)
    .eq("code", c);
  if (error) return { ok: false, error: error.message };
  bustGlobe(groupId);
  // note doesn't affect any count → no home revalidate
  return { ok: true };
}

export async function addCountryPhoto(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireCurrentMember();
  const groupId = await requireActiveGroupId();
  const code = iso2(formData.get("code"));
  const file = formData.get("file");
  if (!code || !(file instanceof File)) {
    return { ok: false, error: "istek bozuk" };
  }
  try {
    let countryCreated = false;
    const { data: existing } = await db
      .from("visited_countries")
      .select("code")
      .eq("group_id", groupId)
      .eq("code", code)
      .maybeSingle();
    if (!existing) {
      const { error: insErr } = await db
        .from("visited_countries")
        .insert({ code, added_by: me.id, group_id: groupId });
      if (insErr) return { ok: false, error: insErr.message };
      countryCreated = true;
    }

    const url = await uploadImage(file, `countries/${code}`);
    const { error } = await db.from("country_photos").insert({
      code,
      url,
      added_by: me.id,
      group_id: groupId,
    });
    if (error) return { ok: false, error: error.message };
    bustGlobe(groupId);
    if (countryCreated) revalidatePath("/tatiller");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function removeCountryPhotosBulk(
  ids: string[]
): Promise<{ ok: boolean; error?: string }> {
  await requireCurrentMember();
  const groupId = await requireActiveGroupId();
  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, error: "boş istek" };
  }
  const { data: rows } = await db
    .from("country_photos")
    .select("id, url")
    .eq("group_id", groupId)
    .in("id", ids);
  const { error } = await db
    .from("country_photos")
    .delete()
    .eq("group_id", groupId)
    .in("id", ids);
  if (error) return { ok: false, error: error.message };
  await Promise.allSettled(
    (rows ?? []).map((r: { url: string }) => removeByUrl(r.url))
  );
  bustGlobe(groupId);
  // photo deletion doesn't affect home stats
  return { ok: true };
}

export async function removeCountryPhoto(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  await requireCurrentMember();
  const groupId = await requireActiveGroupId();
  if (!id) return { ok: false, error: "id yok" };
  const { data: row } = await db
    .from("country_photos")
    .select("url")
    .eq("group_id", groupId)
    .eq("id", id)
    .single();
  const { error } = await db
    .from("country_photos")
    .delete()
    .eq("group_id", groupId)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  if (row?.url) {
    try {
      await removeByUrl(row.url);
    } catch {}
  }
  bustGlobe(groupId);
  return { ok: true };
}
