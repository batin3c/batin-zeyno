import { requireCurrentMember, requireActiveGroupId } from "@/lib/dal";
import { db } from "@/lib/supabase";
import { AppHeader } from "@/components/app-header";
import { AlbumClient } from "@/components/album-client";
import type { VisitedCity, CityPhoto, Trip } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AlbumPage() {
  const me = await requireCurrentMember();
  const groupId = await requireActiveGroupId();

  const [{ data: cities }, { data: cityPhotos }, { data: trips }] =
    await Promise.all([
      db
        .from("visited_cities")
        .select("*")
        .eq("group_id", groupId)
        .order("sort_order", { ascending: true })
        .order("added_at", { ascending: false }),
      db
        .from("city_photos")
        .select("*")
        .eq("group_id", groupId)
        .order("added_at", { ascending: false }),
      db
        .from("trips")
        .select("*")
        .eq("group_id", groupId)
        .order("start_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
    ]);

  return (
    <>
      <AppHeader member={me} title="albüm" />
      <AlbumClient
        cities={(cities ?? []) as VisitedCity[]}
        photos={(cityPhotos ?? []) as CityPhoto[]}
        trips={(trips ?? []) as Trip[]}
      />
    </>
  );
}
