"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { requireCurrentMember, requireActiveGroupId } from "@/lib/dal";
import { uploadImage, removeByUrl } from "@/lib/storage";
import { str } from "@/lib/form-helpers";

// Mirrors the tag scheme in app/actions/cities.ts so trip mutations refresh
// the album/globe page (which lists trips for chip filtering + sheet tagging).
const bustGlobe = (groupId: string) => updateTag(`globe-data:${groupId}`);

async function uploadCoverIfAny(
  formData: FormData
): Promise<string | null | undefined> {
  const file = formData.get("cover_file");
  if (!(file instanceof File) || file.size === 0) return undefined;
  return uploadImage(file, "covers");
}

export async function createTrip(formData: FormData) {
  const me = await requireCurrentMember();
  const groupId = await requireActiveGroupId();
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

  const { data, error } = await db
    .from("trips")
    .insert({
      name,
      description,
      start_date,
      end_date,
      cover_url,
      created_by: me.id,
      group_id: groupId,
    })
    .select("id")
    .single();
  if (error) throw error;

  bustGlobe(groupId);
  revalidatePath("/tatiller");
  revalidatePath("/album");
  redirect(`/trips/${data.id}`);
}

export async function updateTrip(formData: FormData) {
  await requireCurrentMember();
  const groupId = await requireActiveGroupId();
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

  try {
    const uploaded = await uploadCoverIfAny(formData);
    if (uploaded) {
      // remove old cover from storage if present
      const { data: row } = await db
        .from("trips")
        .select("cover_url")
        .eq("id", id)
        .eq("group_id", groupId)
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

  const { error } = await db
    .from("trips")
    .update(patch)
    .eq("id", id)
    .eq("group_id", groupId);
  if (error) throw error;

  bustGlobe(groupId);
  revalidatePath("/tatiller");
  revalidatePath("/album");
  revalidatePath(`/trips/${id}`);
}

export async function removeTripCover(id: string) {
  await requireCurrentMember();
  const groupId = await requireActiveGroupId();
  const { data: row } = await db
    .from("trips")
    .select("cover_url")
    .eq("id", id)
    .eq("group_id", groupId)
    .single();
  const old = row?.cover_url as string | null;
  const { error } = await db
    .from("trips")
    .update({ cover_url: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("group_id", groupId);
  if (error) throw error;
  if (old && old.includes("/baze-media/")) {
    try {
      await removeByUrl(old);
    } catch {}
  }
  revalidatePath("/tatiller");
  revalidatePath(`/trips/${id}`);
}

export async function deleteTrip(formData: FormData) {
  await requireCurrentMember();
  const groupId = await requireActiveGroupId();
  const id = str(formData.get("id"));
  if (!id) return;
  const { error } = await db
    .from("trips")
    .delete()
    .eq("id", id)
    .eq("group_id", groupId);
  if (error) throw error;
  bustGlobe(groupId);
  revalidatePath("/tatiller");
  revalidatePath("/album");
  redirect("/tatiller");
}
