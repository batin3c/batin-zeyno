"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { requireCurrentMember } from "@/lib/dal";
import { uploadImage, removeByUrl } from "@/lib/storage";
import { str, num } from "@/lib/form-helpers";

async function uploadCoverIfAny(
  formData: FormData
): Promise<string | null | undefined> {
  const file = formData.get("cover_file");
  if (!(file instanceof File) || file.size === 0) return undefined;
  return uploadImage(file, "covers");
}

export async function createTrip(formData: FormData) {
  const me = await requireCurrentMember();
  const name = str(formData.get("name"));
  if (!name) return;
  const description = str(formData.get("description"));
  const start_date = str(formData.get("start_date"));
  const end_date = str(formData.get("end_date"));

  let cover_url: string | null = null;
  try {
    const uploaded = await uploadCoverIfAny(formData);
    if (uploaded) cover_url = uploaded;
  } catch {
    // ignore cover upload failure — create trip anyway
  }

  const center_lat = num(formData.get("center_lat"));
  const center_lng = num(formData.get("center_lng"));

  const { data, error } = await db
    .from("trips")
    .insert({
      name,
      description,
      start_date,
      end_date,
      cover_url,
      center_lat,
      center_lng,
      created_by: me.id,
    })
    .select("id")
    .single();
  if (error) throw error;

  revalidatePath("/");
  redirect(`/trips/${data.id}`);
}

export async function updateTrip(formData: FormData) {
  await requireCurrentMember();
  const id = str(formData.get("id"));
  const name = str(formData.get("name"));
  if (!id || !name) return;

  const patch: Record<string, unknown> = {
    name,
    description: str(formData.get("description")),
    start_date: str(formData.get("start_date")),
    end_date: str(formData.get("end_date")),
    updated_at: new Date().toISOString(),
  };

  const center_lat = num(formData.get("center_lat"));
  const center_lng = num(formData.get("center_lng"));
  if (center_lat !== null && center_lng !== null) {
    patch.center_lat = center_lat;
    patch.center_lng = center_lng;
  }

  try {
    const uploaded = await uploadCoverIfAny(formData);
    if (uploaded) {
      // remove old cover from storage if present
      const { data: row } = await db
        .from("trips")
        .select("cover_url")
        .eq("id", id)
        .single();
      const old = row?.cover_url as string | null;
      if (old && old.includes("/baze-media/")) {
        try {
          await removeByUrl(old);
        } catch {}
      }
      patch.cover_url = uploaded;
    }
  } catch {
    // ignore upload failure
  }

  const { error } = await db.from("trips").update(patch).eq("id", id);
  if (error) throw error;

  revalidatePath("/");
  revalidatePath(`/trips/${id}`);
}

export async function removeTripCover(id: string) {
  await requireCurrentMember();
  const { data: row } = await db
    .from("trips")
    .select("cover_url")
    .eq("id", id)
    .single();
  const old = row?.cover_url as string | null;
  const { error } = await db
    .from("trips")
    .update({ cover_url: null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  if (old && old.includes("/baze-media/")) {
    try {
      await removeByUrl(old);
    } catch {}
  }
  revalidatePath("/");
  revalidatePath(`/trips/${id}`);
}

export async function reorderTrips(
  orderedIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  await requireCurrentMember();
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { ok: false, error: "bozuk istek" };
  }
  const now = new Date().toISOString();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await db
      .from("trips")
      .update({ sort_order: (i + 1) * 100, updated_at: now })
      .eq("id", orderedIds[i]);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/");
  return { ok: true };
}

export async function deleteTrip(formData: FormData) {
  await requireCurrentMember();
  const id = str(formData.get("id"));
  if (!id) return;
  const { error } = await db.from("trips").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/");
  redirect("/");
}
