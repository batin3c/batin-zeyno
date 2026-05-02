"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { requireCurrentMember } from "@/lib/dal";
import { parseKml } from "@/lib/kml";

export type ImportResult = {
  ok: boolean;
  count: number;
  error?: string;
};

export async function importKml(formData: FormData): Promise<ImportResult> {
  const me = await requireCurrentMember();
  const tripId = String(formData.get("trip_id") ?? "");
  const file = formData.get("file");

  if (!tripId || !(file instanceof File)) {
    return { ok: false, count: 0, error: "istek bozuk" };
  }
  if (file.size === 0) {
    return { ok: false, count: 0, error: "dosya boş" };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, count: 0, error: "dosya devasa lan (max 10 MB)" };
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, count: 0, error: "dosya anlaşılmadı" };
  }

  const placemarks = parseKml(text);
  if (placemarks.length === 0) {
    return { ok: false, count: 0, error: "kml'de hiç yer yok" };
  }

  const rows = placemarks.map((p) => ({
    trip_id: tripId,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    note: p.description ?? null,
    category: "other",
    status: "want",
    added_by: me.id,
  }));

  const { error } = await db.from("locations").insert(rows);
  if (error) return { ok: false, count: 0, error: error.message };

  revalidatePath(`/trips/${tripId}`);
  return { ok: true, count: placemarks.length };
}
