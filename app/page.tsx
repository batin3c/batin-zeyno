import { db } from "@/lib/supabase";
import { requireCurrentMember } from "@/lib/dal";
import { AppHeader } from "@/components/app-header";
import { GlobeClient } from "./globe-client";
import type {
  VisitedCountry,
  CountryPhoto,
  VisitedCity,
  CityPhoto,
} from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadGlobeData() {
  const [
    { data: visited },
    { data: photos },
    { data: cities },
    { data: cityPhotos },
  ] = await Promise.all([
    db
      .from("visited_countries")
      .select("*")
      .order("added_at", { ascending: false }),
    db
      .from("country_photos")
      .select("*")
      .order("added_at", { ascending: false }),
    db
      .from("visited_cities")
      .select("*")
      .order("added_at", { ascending: false }),
    db
      .from("city_photos")
      .select("*")
      .order("added_at", { ascending: false }),
  ]);
  return {
    visited: (visited ?? []) as VisitedCountry[],
    photos: (photos ?? []) as CountryPhoto[],
    cities: (cities ?? []) as VisitedCity[],
    cityPhotos: (cityPhotos ?? []) as CityPhoto[],
  };
}

export default async function GlobePage() {
  const me = await requireCurrentMember();
  const { visited, photos, cities, cityPhotos } = await loadGlobeData();

  return (
    <>
      <AppHeader member={me} />
      <main className="flex-1 w-full">
        <GlobeClient
          visited={visited}
          photos={photos}
          cities={cities}
          cityPhotos={cityPhotos}
        />
      </main>
    </>
  );
}
