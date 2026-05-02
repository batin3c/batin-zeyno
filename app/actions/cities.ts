"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { requireCurrentMember } from "@/lib/dal";
import { uploadImage, removeByUrl } from "@/lib/storage";
import { fetchCityBoundary, type GeoJsonGeometry } from "@/lib/osm";
import { iso2 } from "@/lib/form-helpers";

export async function addCity(input: {
  name: string;
  lat: number;
  lng: number;
  country_code?: string | null;
  google_place_id?: string | null;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const me = await requireCurrentMember();
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
      .eq("code", code)
      .maybeSingle();
    if (!existing) {
      await db
        .from("visited_countries")
        .insert({ code, added_by: me.id });
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
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/globe");
  revalidatePath("/");
  return { ok: true, id: data.id as string };
}

export async function updateCityNote(
  id: string,
  note: string | null
): Promise<{ ok: boolean; error?: string }> {
  await requireCurrentMember();
  if (!id) return { ok: false, error: "id yok" };
  const clean =
    typeof note === "string" && note.trim().length > 0 ? note.trim() : null;
  const { error } = await db
    .from("visited_cities")
    .update({ note: clean, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/globe");
  // note doesn't affect counts → no home revalidate
  return { ok: true };
}

export async function deleteCity(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  await requireCurrentMember();
  if (!id) return { ok: false, error: "id yok" };
  const { data: photos } = await db
    .from("city_photos")
    .select("url")
    .eq("city_id", id);
  const { error } = await db.from("visited_cities").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  for (const p of (photos ?? []) as { url: string }[]) {
    try {
      await removeByUrl(p.url);
    } catch {}
  }
  revalidatePath("/globe");
  revalidatePath("/");
  return { ok: true };
}

export async function addCityPhoto(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireCurrentMember();
  const cityId = String(formData.get("city_id") ?? "");
  const file = formData.get("file");
  if (!cityId || !(file instanceof File)) {
    return { ok: false, error: "istek bozuk" };
  }
  try {
    const url = await uploadImage(file, `cities/${cityId}`);
    const { error } = await db.from("city_photos").insert({
      city_id: cityId,
      url,
      added_by: me.id,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/globe");
    // photo upload doesn't change city count → no home revalidate
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getCityBoundary(
  cityId: string
): Promise<GeoJsonGeometry | null> {
  await requireCurrentMember();
  if (!cityId) return null;

  const { data: city } = await db
    .from("visited_cities")
    .select("id, name, country_code, boundary_geojson")
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
    .eq("id", cityId);

  return fetched;
}

export async function removeCityPhotosBulk(
  ids: string[]
): Promise<{ ok: boolean; error?: string }> {
  await requireCurrentMember();
  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, error: "boş istek" };
  }
  const { data: rows } = await db
    .from("city_photos")
    .select("id, url")
    .in("id", ids);
  const { error } = await db.from("city_photos").delete().in("id", ids);
  if (error) return { ok: false, error: error.message };
  await Promise.allSettled(
    (rows ?? []).map((r: { url: string }) => removeByUrl(r.url))
  );
  revalidatePath("/globe");
  // photo deletion doesn't affect city count
  return { ok: true };
}

export async function removeCityPhoto(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  await requireCurrentMember();
  if (!id) return { ok: false, error: "id yok" };
  const { data: row } = await db
    .from("city_photos")
    .select("url")
    .eq("id", id)
    .single();
  const { error } = await db.from("city_photos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  if (row?.url) {
    try {
      await removeByUrl(row.url);
    } catch {}
  }
  revalidatePath("/globe");
  return { ok: true };
}
