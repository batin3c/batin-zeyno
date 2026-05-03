"use server";

import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/lib/supabase";
import { requireCurrentMember, requireActiveGroupId } from "@/lib/dal";
import type { Location, Member, CityPhoto } from "@/lib/types";

const COMMUNITY_PAGE = 30;

export type CommunityLocation = Location & {
  added_by_member: Pick<Member, "id" | "name" | "surname" | "color"> | null;
  city_name: string | null;
  country_code: string | null;
};

/**
 * Fetch public locations for a city — by name+country_code, NOT by city id,
 * because community locations come from other groups' cities (different ids).
 * Cursor-based on created_at desc.
 */
export async function loadCommunityLocations({
  cityName,
  countryCode,
  cursor,
  limit = COMMUNITY_PAGE,
}: {
  cityName: string;
  countryCode: string | null;
  cursor?: string | null;
  limit?: number;
}): Promise<{ locations: CommunityLocation[]; nextCursor: string | null }> {
  await requireCurrentMember();
  const groupId = await requireActiveGroupId();
  if (!cityName) return { locations: [], nextCursor: null };
  const take = Math.min(Math.max(limit, 1), 60);

  // find cities (across groups) matching this city by name + country
  let cityQ = db
    .from("visited_cities")
    .select("id, name, country_code, lat, lng")
    .eq("name", cityName)
    .eq("is_public", true)
    .neq("group_id", groupId);
  if (countryCode) cityQ = cityQ.eq("country_code", countryCode);
  const { data: cities } = await cityQ;

  // also widen the search: any public location whose lat/lng is near our
  // city (within ~30km bbox). Without PostGIS this is a coarse filter.
  const cityIds = (cities ?? []).map((c) => c.id as string);

  if (cityIds.length === 0) {
    return { locations: [], nextCursor: null };
  }

  // locations link to trips, not directly to cities. Pull public locations
  // whose lat/lng fall near any matched city's centroid (~0.3° box).
  const lats = (cities ?? []).map((c) => c.lat as number);
  const lngs = (cities ?? []).map((c) => c.lng as number);
  const minLat = Math.min(...lats) - 0.3;
  const maxLat = Math.max(...lats) + 0.3;
  const minLng = Math.min(...lngs) - 0.3;
  const maxLng = Math.max(...lngs) + 0.3;

  let q = db
    .from("locations")
    .select("*")
    .eq("is_public", true)
    .gte("lat", minLat)
    .lte("lat", maxLat)
    .gte("lng", minLng)
    .lte("lng", maxLng)
    .order("created_at", { ascending: false })
    .limit(take);
  if (cursor) q = q.lt("created_at", cursor);
  const { data: locs } = await q;
  const locations = (locs ?? []) as Location[];

  // exclude any location belonging to OUR group (we already see those in
  // "bizimkiler"). Locations don't carry group_id directly; resolve via trip.
  const tripIds = Array.from(
    new Set(locations.map((l) => l.trip_id).filter((x): x is string => !!x))
  );
  let ourTripIds = new Set<string>();
  if (tripIds.length > 0) {
    const { data: trips } = await db
      .from("trips")
      .select("id")
      .in("id", tripIds)
      .eq("group_id", groupId);
    ourTripIds = new Set((trips ?? []).map((t) => t.id as string));
  }
  const filtered = locations.filter(
    (l) => !l.trip_id || !ourTripIds.has(l.trip_id)
  );

  // enrich with author + city association
  const memberIds = Array.from(
    new Set(filtered.map((l) => l.added_by).filter((x): x is string => !!x))
  );
  const { data: members } =
    memberIds.length > 0
      ? await db
          .from("members")
          .select("id, name, surname, color")
          .in("id", memberIds)
      : { data: [] };
  const memberMap = new Map(
    ((members ?? []) as Array<
      Pick<Member, "id" | "name" | "surname" | "color">
    >).map((m) => [m.id, m])
  );

  const enriched: CommunityLocation[] = filtered.map((l) => ({
    ...l,
    added_by_member: l.added_by ? memberMap.get(l.added_by) ?? null : null,
    city_name: cityName,
    country_code: countryCode,
  }));

  const last = locations[locations.length - 1];
  const nextCursor = locations.length === take ? last.created_at : null;
  return { locations: enriched, nextCursor };
}

export async function loadCommunityCityPhotos({
  cityName,
  countryCode,
}: {
  cityName: string;
  countryCode: string | null;
}): Promise<CityPhoto[]> {
  await requireCurrentMember();
  const groupId = await requireActiveGroupId();
  if (!cityName) return [];

  let cityQ = db
    .from("visited_cities")
    .select("id")
    .eq("name", cityName)
    .eq("is_public", true)
    .neq("group_id", groupId);
  if (countryCode) cityQ = cityQ.eq("country_code", countryCode);
  const { data: cities } = await cityQ;

  const cityIds = (cities ?? []).map((c) => c.id as string);
  if (cityIds.length === 0) return [];

  const { data: photos } = await db
    .from("city_photos")
    .select("*")
    .in("city_id", cityIds)
    .order("added_at", { ascending: false })
    .limit(60);
  return (photos ?? []) as CityPhoto[];
}

/**
 * Clone a public location into the active group. Creates a new location row
 * with no trip_id (album-level memory) and copies name, address, lat/lng,
 * place_id, category. Photos are NOT copied — they stay with the source.
 */
export async function saveLocationToOurGroup(
  sourceLocationId: string
): Promise<{ ok: boolean; locationId?: string; error?: string }> {
  const me = await requireCurrentMember();
  const groupId = await requireActiveGroupId();
  if (!sourceLocationId) return { ok: false, error: "id yok" };
  const { data: src } = await db
    .from("locations")
    .select("*")
    .eq("id", sourceLocationId)
    .eq("is_public", true)
    .maybeSingle();
  if (!src) return { ok: false, error: "yer bulunamadı" };
  const source = src as Location;

  // de-dupe: if this group already has a location with the same place_id,
  // skip and return the existing one
  if (source.google_place_id) {
    const { data: trips } = await db
      .from("trips")
      .select("id")
      .eq("group_id", groupId);
    const tripIds = (trips ?? []).map((t) => t.id as string);
    if (tripIds.length > 0) {
      const { data: dup } = await db
        .from("locations")
        .select("id")
        .eq("google_place_id", source.google_place_id)
        .in("trip_id", tripIds)
        .maybeSingle();
      if (dup) return { ok: true, locationId: dup.id as string };
    }
  }

  const { data: created, error } = await db
    .from("locations")
    .insert({
      trip_id: null,
      name: source.name,
      address: source.address,
      lat: source.lat,
      lng: source.lng,
      google_place_id: source.google_place_id,
      google_maps_url: source.google_maps_url,
      category: source.category,
      status: "want",
      added_by: me.id,
      is_public: false,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  updateTag(`globe-data:${groupId}`);
  revalidatePath("/album");
  return { ok: true, locationId: created.id as string };
}
