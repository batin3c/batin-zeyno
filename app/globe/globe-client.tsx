"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Geometry } from "geojson";
import { CountrySheet } from "@/components/country-sheet";
import { CitySheet } from "@/components/city-sheet";
import { getCityBoundary } from "@/app/actions/cities";
import type {
  VisitedCountry,
  CountryPhoto,
  VisitedCity,
  CityPhoto,
} from "@/lib/types";

const GlobeCanvas = dynamic(
  () => import("@/components/globe-canvas").then((m) => m.GlobeCanvas),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full flex items-center justify-center"
        style={{ height: "calc(100dvh - 64px)", color: "var(--text-muted)" }}
      >
        <span className="label">dünya yükleniyor…</span>
      </div>
    ),
  }
);

const TOTAL_COUNTRIES = 195;

type Selection =
  | { kind: "country"; code: string }
  | { kind: "city"; id: string }
  | null;

export function GlobeClient({
  visited,
  photos,
  cities,
  cityPhotos,
}: {
  visited: VisitedCountry[];
  photos: CountryPhoto[];
  cities: VisitedCity[];
  cityPhotos: CityPhoto[];
}) {
  const [selection, setSelection] = useState<Selection>(null);
  const [boundary, setBoundary] = useState<{
    id: string;
    geometry: Geometry;
  } | null>(null);

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

  // load city boundary lazily when city is selected
  useEffect(() => {
    if (selection?.kind !== "city") {
      setBoundary(null);
      return;
    }
    const id = selection.id;
    let active = true;
    getCityBoundary(id)
      .then((geo) => {
        if (!active || !geo) return;
        setBoundary({ id, geometry: geo as Geometry });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selection]);

  return (
    <div className="relative">
      <GlobeCanvas
        visitedCodes={visitedCodes}
        cities={cityPoints}
        selectedCityBoundary={boundary}
        onSelectCountry={(code) =>
          setSelection({ kind: "country", code })
        }
        onSelectCity={(id) => setSelection({ kind: "city", id })}
      />
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none flex items-center gap-1.5 anim-bounce-in"
        style={{
          background: "var(--accent-soft)",
          border: "2px solid var(--ink)",
          borderRadius: "999px",
          padding: "0.4rem 0.95rem",
          boxShadow: "var(--shadow-pop-sm)",
          fontWeight: 700,
          fontSize: "0.88rem",
          color: "var(--ink)",
        }}
      >
        <span style={{ fontSize: "1rem" }}>🌍</span>
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
      />
    </div>
  );
}
