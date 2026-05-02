import { db } from "@/lib/supabase";
import { requireCurrentMember, requireActiveGroupId } from "@/lib/dal";
import { BackfillClient } from "@/components/backfill-client";
import type { VisitedCity, Location } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BackfillPage() {
  const me = await requireCurrentMember();
  const groupId = await requireActiveGroupId();

  // cities with no photos but with a google_place_id (or at least name+coords
  // we can resolve via findPlaceFromQuery)
  const { data: citiesRaw } = await db
    .from("visited_cities")
    .select("id, name, country_code, lat, lng, google_place_id, group_id, sort_order, added_at, updated_at, added_by, note, boundary_geojson, boundary_fetched_at, cover_photo_id")
    .eq("group_id", groupId)
    .order("added_at", { ascending: false });
  const cities = (citiesRaw ?? []) as VisitedCity[];

  // locations across all this group's trips with empty google_photo_urls
  const { data: locsRaw } = await db
    .from("locations")
    .select("*, trips!inner(group_id)")
    .eq("trips.group_id", groupId);
  const locations = (locsRaw ?? []) as (Location & { trips: { group_id: string } })[];

  // load only the city ids that already have photos so the client can filter
  const { data: cityPhotoLinks } = await db
    .from("city_photos")
    .select("city_id")
    .eq("group_id", groupId);
  const cityIdsWithPhotos = new Set(
    (cityPhotoLinks ?? []).map((r) => r.city_id as string)
  );

  const citiesNeed = cities.filter((c) => !cityIdsWithPhotos.has(c.id));
  const locsNeed = locations.filter(
    (l) => !Array.isArray(l.google_photo_urls) || l.google_photo_urls.length === 0
  );

  return (
    <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
      <div className="mb-6">
        <span className="label">arşiv onarımı</span>
        <h1
          className="display mt-2"
          style={{ fontSize: "2.4rem", color: "var(--ink)" }}
        >
          fotoğraf çek
        </h1>
        <p
          className="mt-2 text-[0.9rem]"
          style={{ color: "var(--text-muted)" }}
        >
          {citiesNeed.length} şehir + {locsNeed.length} yer fotoğrafsız.
          tek tıkla google&apos;dan çekiyorum.
        </p>
      </div>
      <BackfillClient
        cities={citiesNeed.map((c) => ({
          id: c.id,
          name: c.name,
          lat: c.lat,
          lng: c.lng,
          google_place_id: c.google_place_id,
        }))}
        locations={locsNeed.map((l) => ({
          id: l.id,
          name: l.name,
          lat: l.lat,
          lng: l.lng,
          google_place_id: l.google_place_id,
        }))}
        memberName={me.name}
      />
    </main>
  );
}
