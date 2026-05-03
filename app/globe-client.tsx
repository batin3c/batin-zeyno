"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Geometry } from "geojson";
import { CountrySheet } from "@/components/country-sheet";
import { CitySheet } from "@/components/city-sheet";
import type {
  VisitedCountry,
  CountryPhoto,
  VisitedCity,
  CityPhoto,
  Trip,
} from "@/lib/types";

const GlobeCanvas = dynamic(
  () => import("@/components/globe-canvas").then((m) => m.GlobeCanvas),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full flex items-center justify-center"
        style={{ height: "100%", color: "var(--text-muted)" }}
      >
        <span className="label">dünya yükleniyor…</span>
      </div>
    ),
  }
);

const TOTAL_COUNTRIES = 195;

function haloCircle(lat: number, lng: number, radiusKm: number): Geometry {
  const n = 40;
  const latStep = radiusKm / 111;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const lngStep = radiusKm / (111 * (Math.abs(cosLat) < 0.05 ? 0.05 : cosLat));
  const coords: number[][] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * 2 * Math.PI;
    coords.push([lng + Math.sin(t) * lngStep, lat + Math.cos(t) * latStep]);
  }
  return { type: "Polygon", coordinates: [coords] };
}

type Selection =
  | { kind: "country"; code: string }
  | { kind: "city"; id: string }
  | null;

export function GlobeClient({
  visited,
  photos,
  cities,
  cityPhotos,
  trips,
}: {
  visited: VisitedCountry[];
  photos: CountryPhoto[];
  cities: VisitedCity[];
  cityPhotos: CityPhoto[];
  trips: Trip[];
}) {
  const [selection, setSelection] = useState<Selection>(null);

  const visitedCodes = useMemo(
    () => new Set(visited.map((v) => v.code)),
    [visited]
  );

  const cityPoints = useMemo(
    () =>
      cities.map((c) => ({
        id: c.id,
        name: c.name,
        lat: c.lat,
        lng: c.lng,
      })),
    [cities]
  );

  const routes = useMemo(() => {
    const ordered = [...cities].sort((a, b) =>
      (a.added_at ?? "").localeCompare(b.added_at ?? "")
    );
    const out: {
      startLat: number;
      startLng: number;
      endLat: number;
      endLng: number;
    }[] = [];
    for (let i = 1; i < ordered.length; i++) {
      const a = ordered[i - 1];
      const b = ordered[i];
      if (a.lat === b.lat && a.lng === b.lng) continue;
      out.push({
        startLat: a.lat,
        startLng: a.lng,
        endLat: b.lat,
        endLng: b.lng,
      });
    }
    return out;
  }, [cities]);

  const countryData = useMemo(() => {
    if (selection?.kind !== "country") return null;
    const v = visited.find((x) => x.code === selection.code) ?? null;
    const ps = photos.filter((p) => p.code === selection.code);
    const citiesInCountry = cities.filter(
      (c) => c.country_code === selection.code
    );
    return {
      code: selection.code,
      visited: v,
      photos: ps,
      cities: citiesInCountry,
    };
  }, [selection, visited, photos, cities]);

  const cityData = useMemo(() => {
    if (selection?.kind !== "city") return null;
    const city = cities.find((c) => c.id === selection.id);
    if (!city) return null;
    const ps = cityPhotos.filter((p) => p.city_id === city.id);
    return { city, photos: ps };
  }, [selection, cities, cityPhotos]);

  const boundary = useMemo(() => {
    if (selection?.kind !== "city") return null;
    const city = cities.find((c) => c.id === selection.id);
    if (!city) return null;
    return { id: city.id, geometry: haloCircle(city.lat, city.lng, 90) };
  }, [selection, cities]);

  return (
    <div className="relative w-full h-full">
      <GlobeCanvas
        visitedCodes={visitedCodes}
        cities={cityPoints}
        selectedCityBoundary={boundary}
        selectedCityId={selection?.kind === "city" ? selection.id : null}
        routes={routes}
        onSelectCountry={(code) => setSelection({ kind: "country", code })}
        onSelectCity={(id) => setSelection({ kind: "city", id })}
      />

      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none flex items-center gap-1.5"
        style={{
          background: "var(--accent-soft)",
          border: "2px solid var(--ink)",
          borderRadius: "999px",
          padding: "0.35rem 0.85rem",
          boxShadow: "var(--shadow-pop-sm)",
          fontWeight: 700,
          fontSize: "0.8rem",
          color: "var(--ink)",
        }}
      >
        <span>🌍</span>
        <span>
          {visitedCodes.size}
          <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
            /{TOTAL_COUNTRIES}
          </span>{" "}
          ülke · <span>{cities.length}</span> şehir
        </span>
      </div>

      <CountrySheet
        data={countryData}
        open={selection?.kind === "country"}
        onClose={() => setSelection(null)}
        onOpenCity={(id) => setSelection({ kind: "city", id })}
      />
      <CitySheet
        data={cityData}
        open={selection?.kind === "city"}
        onClose={() => setSelection(null)}
        trips={trips}
      />
    </div>
  );
}
