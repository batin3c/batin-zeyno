"use server";

import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/lib/supabase";
import { requireCurrentMember, requireActiveGroupId } from "@/lib/dal";
import { uploadImage, uploadImageFromUrl, removeByUrl } from "@/lib/storage";
import { fetchCityBoundary, type GeoJsonGeometry } from "@/lib/osm";
import { iso2 } from "@/lib/form-helpers";
import { notifyOthers } from "./push";

// invalidate just this group's globe-data cache (matches the tag set in
// app/layout.tsx: `globe-data:${groupId}`). Other groups' caches stay warm.
const bustGlobe = (groupId: string) => updateTag(`globe-data:${groupId}`);

/**
 * Drag-reorder of album cards. Single SQL via Postgres function — see
 * supabase/migrations/0015_city_sort_order.sql. Group_id scoped server-side
 * so a member can't reorder another group's cities.
 */
export async function reorderVisitedCities(
  orderedIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  await requireCurrentMember();
  const groupId = await requireActiveGroupId();
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { ok: false, error: "boş istek" };
  }
  const { error } = await db.rpc("reorder_visited_cities", {
    p_group_id: groupId,
    p_ids: orderedIds,
  });
  if (error) return { ok: false, error: error.message };
  bustGlobe(groupId);
  return { ok: true };
}

export async function addCity(input: {
  name: string;
  lat: number;
  lng: number;
  country_code?: string | null;
  google_place_id?: string | null;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const me = await requireCurrentMember();
  const groupId = await requireActiveGroupId();
  const name = input.name?.trim();
  if (!name) return { ok: false, error: "isim boş" };
  if (typeof input.lat !== "number" || typeof input.lng !== "number") {
    return { ok: false, error: "koordinat yok" };
  }
  const code = iso2(input.country_code ?? null);

  // auto-mark country as visited if a code is present
  if (code) {
    const { data: existing } = await db
      .from("visited_countries")
      .select("code")
      .eq("group_id", groupId)
      .eq("code", code)
      .maybeSingle();
    if (!existing) {
      await db
        .from("visited_countries")
        .insert({ code, added_by: me.id, group_id: groupId });
    }
  }

  const { data, error } = await db
    .from("visited_cities")
    .insert({
      name,
      country_code: code,
      lat: input.lat,
      lng: input.lng,
      google_place_id: input.google_place_id ?? null,
      added_by: me.id,
      group_id: groupId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  bustGlobe(groupId);
  revalidatePath("/tatiller");
  notifyOthers({
    title: `${me.name.toLowerCase()} yeni şehir ekledi 🌍`,
    body: name,
    url: `/`,
    tag: `city-${groupId}`,
  }).catch(() => {});
  return { ok: true, id: data.id as string };
}

function refererFromGoogleUrl(url: string): string | undefined {
  try {
    const u = new URL(url);
    const r = u.searchParams.get("r_url");
    return r ? r + "/" : undefined;
  } catch {
    return undefined;
  }
}

/**
 * One-shot backfill: take Google photo URLs already resolved by the JS SDK
 * on the client and persist them as city_photos. Server-side download
 * bypasses Google's referer restrictions thanks to uploadImageFromUrl.
 */
export async function backfillCityPhotosFromUrls(
  cityId: string,
  urls: string[]
): Promise<{ ok: boolean; inserted: number; error?: string }> {
  const me = await requireCurrentMember();
  const groupId = await requireActiveGroupId();
  if (!cityId || !Array.isArray(urls) || urls.length === 0) {
    return { ok: false, inserted: 0, error: "boş istek" };
  }
  const { data: city } = await db
    .from("visited_cities")
    .select("id")
    .eq("group_id", groupId)
    .eq("id", cityId)
    .maybeSingle();
  if (!city) return { ok: false, inserted: 0, error: "yetkisiz" };

  const persisted = await Promise.all(
    urls.slice(0, 5).map((u) =>
      uploadImageFromUrl(u, `cities/${cityId}`, {
        referer: refererFromGoogleUrl(u),
      })
    )
  );
  const ok = persisted.filter((u): u is string => !!u);
  if (ok.length === 0) return { ok: false, inserted: 0, error: "indirilemedi" };

  const rows = ok.map((url) => ({
    city_id: cityId,
    url,
    added_by: me.id,
    group_id: groupId,
  }));
  const { error } = await db.from("city_photos").insert(rows);
  if (error) return { ok: false, inserted: 0, error: error.message };
  bustGlobe(groupId);
  return { ok: true, inserted: ok.length };
}

/**
 * Pick which photo represents this city in the album grid. Pass null to
 * fall back to "first photo by added_at". Verifies the photo belongs to
 * the same city (and group) so a forged id can't pin someone else's photo.
 */
export async function setCityCoverPhoto(
  cityId: string,
  photoId: string | null
): Promise<{ ok: boolean; error?: string }> {
  await requireCurrentMember();
  const groupId = await requireActiveGroupId();
  if (!cityId) return { ok: false, error: "id yok" };
  if (photoId) {
    const { data: photo } = await db
      .from("city_photos")
      .select("id")
      .eq("group_id", groupId)
      .eq("id", photoId)
      .eq("city_id", cityId)
      .maybeSingle();
    if (!photo) return { ok: false, error: "yetkisiz" };
  }
  const { error } = await db
    .from("visited_cities")
    .update({ cover_photo_id: photoId, updated_at: new Date().toISOString() })
    .eq("group_id", groupId)
    .eq("id", cityId);
  if (error) return { ok: false, error: error.message };
  bustGlobe(groupId);
  return { ok: true };
}

export async function updateCityNote(
  id: string,
  note: string | null
): Promise<{ ok: boolean; error?: string }> {
  await requireCurrentMember();
  const groupId = await requireActiveGroupId();
  if (!id) return { ok: false, error: "id yok" };
  const clean =
    typeof note === "string" && note.trim().length > 0 ? note.trim() : null;
  const { error } = await db
    .from("visited_cities")
    .update({ note: clean, updated_at: new Date().toISOString() })
    .eq("group_id", groupId)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  bustGlobe(groupId);
  // note doesn't affect counts → no home revalidate
  return { ok: true };
}

export async function deleteCity(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  await requireCurrentMember();
  const groupId = await requireActiveGroupId();
  if (!id) return { ok: false, error: "id yok" };
  const { data: photos } = await db
    .from("city_photos")
    .select("url")
    .eq("group_id", groupId)
    .eq("city_id", id);
  const { error } = await db
    .from("visited_cities")
    .delete()
    .eq("group_id", groupId)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  for (const p of (photos ?? []) as { url: string }[]) {
    try {
      await removeByUrl(p.url);
    } catch {}
  }
  bustGlobe(groupId);
  revalidatePath("/tatiller");
  return { ok: true };
}

export async function addCityPhoto(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireCurrentMember();
  const groupId = await requireActiveGroupId();
  const cityId = String(formData.get("city_id") ?? "");
  const file = formData.get("file");
  if (!cityId || !(file instanceof File)) {
    return { ok: false, error: "istek bozuk" };
  }
  // confirm the parent city belongs to the active group before attaching
  // a photo (prevents cross-group writes if someone forges a city_id)
  const { data: parentCity } = await db
    .from("visited_cities")
    .select("id")
    .eq("group_id", groupId)
    .eq("id", cityId)
    .maybeSingle();
  if (!parentCity) return { ok: false, error: "yetkisiz" };
  try {
    const url = await uploadImage(file, `cities/${cityId}`);
    const { error } = await db.from("city_photos").insert({
      city_id: cityId,
      url,
      added_by: me.id,
      group_id: groupId,
    });
    if (error) return { ok: false, error: error.message };
    bustGlobe(groupId);
    // city name for the push body
    const { data: city } = await db
      .from("visited_cities")
      .select("name")
      .eq("id", cityId)
      .maybeSingle();
    notifyOthers({
      title: `${me.name.toLowerCase()} foto attı 📸`,
      body: (city?.name as string) ?? "albüm",
      url: `/`,
      tag: `city-photo-${cityId}`,
    }).catch(() => {});
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getCityBoundary(
  cityId: string
): Promise<GeoJsonGeometry | null> {
  await requireCurrentMember();
  const groupId = await requireActiveGroupId();
  if (!cityId) return null;

  const { data: city } = await db
    .from("visited_cities")
    .select("id, name, country_code, boundary_geojson")
    .eq("group_id", groupId)
    .eq("id", cityId)
    .maybeSingle();
  if (!city) return null;

  const cached = city.boundary_geojson as GeoJsonGeometry | null;
  if (cached && (cached.type === "Polygon" || cached.type === "MultiPolygon")) {
    return cached;
  }

  const fetched = await fetchCityBoundary(
    city.name as string,
    city.country_code as string | null
  );
  if (!fetched) return null;

  await db
    .from("visited_cities")
    .update({
      boundary_geojson: fetched,
      boundary_fetched_at: new Date().toISOString(),
    })
    .eq("group_id", groupId)
    .eq("id", cityId);

  return fetched;
}

export async function removeCityPhotosBulk(
  ids: string[]
): Promise<{ ok: boolean; error?: string }> {
  await requireCurrentMember();
  const groupId = await requireActiveGroupId();
  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, error: "boş istek" };
  }
  const { data: rows } = await db
    .from("city_photos")
    .select("id, url")
    .eq("group_id", groupId)
    .in("id", ids);
  const { error } = await db
    .from("city_photos")
    .delete()
    .eq("group_id", groupId)
    .in("id", ids);
  if (error) return { ok: false, error: error.message };
  await Promise.allSettled(
    (rows ?? []).map((r: { url: string }) => removeByUrl(r.url))
  );
  bustGlobe(groupId);
  // photo deletion doesn't affect city count
  return { ok: true };
}

export async function removeCityPhoto(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  await requireCurrentMember();
  const groupId = await requireActiveGroupId();
  if (!id) return { ok: false, error: "id yok" };
  const { data: row } = await db
    .from("city_photos")
    .select("url")
    .eq("group_id", groupId)
    .eq("id", id)
    .single();
  const { error } = await db
    .from("city_photos")
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
