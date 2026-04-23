"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { requireCurrentMember } from "@/lib/dal";
import { resolveMapsShareUrl } from "@/lib/google-maps";
import { uploadImage, removeByUrl } from "@/lib/storage";
import type { Category, LocationStatus } from "@/lib/types";

function str(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > 0 ? s : null;
}

function num(v: FormDataEntryValue | null): number | null {
  const s = typeof v === "string" ? v : "";
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export async function createLocation(formData: FormData) {
  const me = await requireCurrentMember();
  const trip_id = str(formData.get("trip_id"));
  const name = str(formData.get("name"));
  const lat = num(formData.get("lat"));
  const lng = num(formData.get("lng"));
  if (!trip_id || !name || lat === null || lng === null) return;

  let google_photo_urls: string[] = [];
  const rawPhotos = formData.get("google_photo_urls");
  if (typeof rawPhotos === "string" && rawPhotos.trim().length > 0) {
    try {
      const parsed = JSON.parse(rawPhotos);
      if (Array.isArray(parsed)) {
        google_photo_urls = parsed.filter((u): u is string => typeof u === "string");
      }
    } catch {}
  }

  const { error } = await db.from("locations").insert({
    trip_id,
    name,
    address: str(formData.get("address")),
    lat,
    lng,
    google_place_id: str(formData.get("google_place_id")),
    google_maps_url: str(formData.get("google_maps_url")),
    category: (str(formData.get("category")) ?? "other") as Category,
    note: str(formData.get("note")),
    visit_date: str(formData.get("visit_date")),
    google_photo_urls,
    status: "want" as LocationStatus,
    added_by: me.id,
  });
  if (error) throw error;

  revalidatePath(`/trips/${trip_id}`);
}

export async function resolveShareUrl(url: string) {
  if (!url) return null;
  return resolveMapsShareUrl(url);
}

export async function updateLocationField(
  id: string,
  tripId: string,
  patch: Partial<{
    name: string;
    note: string | null;
    category: Category;
    status: LocationStatus;
  }>
) {
  await requireCurrentMember();
  const { error } = await db
    .from("locations")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath(`/trips/${tripId}`);
}

export async function toggleLove(id: string, tripId: string) {
  const me = await requireCurrentMember();
  const { data: row, error: e1 } = await db
    .from("locations")
    .select("loved_by")
    .eq("id", id)
    .single();
  if (e1) throw e1;
  const loved: string[] = (row?.loved_by ?? []) as string[];
  const next = loved.includes(me.id)
    ? loved.filter((x) => x !== me.id)
    : [...loved, me.id];
  const { error } = await db
    .from("locations")
    .update({ loved_by: next, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath(`/trips/${tripId}`);
}

export async function toggleVisited(id: string, tripId: string) {
  await requireCurrentMember();
  const { data: row, error: e1 } = await db
    .from("locations")
    .select("status, visit_date")
    .eq("id", id)
    .single();
  if (e1) throw e1;
  const next: LocationStatus = row?.status === "visited" ? "want" : "visited";
  const patch: Record<string, unknown> = {
    status: next,
    updated_at: new Date().toISOString(),
  };
  if (next === "visited" && !row?.visit_date) {
    patch.visit_date = new Date().toISOString().slice(0, 10);
  }
  const { error } = await db.from("locations").update(patch).eq("id", id);
  if (error) throw error;
  revalidatePath(`/trips/${tripId}`);
}

export async function updateVisitDate(
  id: string,
  tripId: string,
  date: string | null
) {
  await requireCurrentMember();
  const clean = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  const { error } = await db
    .from("locations")
    .update({ visit_date: clean, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath(`/trips/${tripId}`);
}

export async function deleteLocation(id: string, tripId: string) {
  await requireCurrentMember();
  // grab photos so we can remove them from storage too
  const { data: row } = await db
    .from("locations")
    .select("photo_urls")
    .eq("id", id)
    .single();
  const { error } = await db.from("locations").delete().eq("id", id);
  if (error) throw error;
  if (row?.photo_urls) {
    for (const u of row.photo_urls as string[]) {
      try {
        await removeByUrl(u);
      } catch {}
    }
  }
  revalidatePath(`/trips/${tripId}`);
}

export async function addLocationPhoto(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  await requireCurrentMember();
  const id = String(formData.get("location_id") ?? "");
  const tripId = String(formData.get("trip_id") ?? "");
  const file = formData.get("file");
  if (!id || !tripId || !(file instanceof File)) {
    return { ok: false, error: "istek bozuk" };
  }
  try {
    const url = await uploadImage(file, `locations/${id}`);
    const { data: row } = await db
      .from("locations")
      .select("photo_urls")
      .eq("id", id)
      .single();
    const current = (row?.photo_urls ?? []) as string[];
    const { error } = await db
      .from("locations")
      .update({
        photo_urls: [...current, url],
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/trips/${tripId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function removeLocationPhoto(
  id: string,
  tripId: string,
  url: string
) {
  await requireCurrentMember();
  const { data: row } = await db
    .from("locations")
    .select("photo_urls")
    .eq("id", id)
    .single();
  const current = (row?.photo_urls ?? []) as string[];
  const next = current.filter((u) => u !== url);
  const { error } = await db
    .from("locations")
    .update({
      photo_urls: next,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
  try {
    await removeByUrl(url);
  } catch {}
  revalidatePath(`/trips/${tripId}`);
}
