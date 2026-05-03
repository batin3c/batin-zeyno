"use client";

import { useMemo, useState } from "react";
import { AlbumGrid } from "./album-grid";
import { CitySheet } from "./city-sheet";
import type { VisitedCity, CityPhoto, Trip } from "@/lib/types";

type Filter = "all" | "untagged" | { tripId: string };

export function AlbumClient({
  cities,
  photos,
  trips,
}: {
  cities: VisitedCity[];
  photos: CityPhoto[];
  trips: Trip[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const filteredCities = useMemo(() => {
    if (filter === "all") return cities;
    if (filter === "untagged") return cities.filter((c) => !c.trip_id);
    return cities.filter((c) => c.trip_id === filter.tripId);
  }, [cities, filter]);

  const cityData = useMemo(() => {
    if (!selectedId) return null;
    const city = cities.find((c) => c.id === selectedId);
    if (!city) return null;
    const ps = photos.filter((p) => p.city_id === city.id);
    return { city, photos: ps };
  }, [selectedId, cities, photos]);

  const untaggedCount = useMemo(
    () => cities.filter((c) => !c.trip_id).length,
    [cities]
  );

  return (
    <>
      {trips.length > 0 && (
        <div className="max-w-3xl w-full mx-auto px-4 pt-3">
          <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1">
            <Chip
              active={filter === "all"}
              onClick={() => setFilter("all")}
              label={`tümü (${cities.length})`}
            />
            {trips.map((t) => {
              const count = cities.filter((c) => c.trip_id === t.id).length;
              const active =
                typeof filter === "object" && filter.tripId === t.id;
              return (
                <Chip
                  key={t.id}
                  active={active}
                  onClick={() => setFilter({ tripId: t.id })}
                  label={`${t.name.toLowerCase()} (${count})`}
                />
              );
            })}
            {untaggedCount > 0 && (
              <Chip
                active={filter === "untagged"}
                onClick={() => setFilter("untagged")}
                label={`etiketsiz (${untaggedCount})`}
              />
            )}
          </div>
        </div>
      )}
      <div className="max-w-3xl w-full mx-auto px-4 pt-4 pb-24">
        <AlbumGrid
          cities={filteredCities}
          photos={photos}
          onSelectCity={(id) => setSelectedId(id)}
        />
      </div>
      <CitySheet
        data={cityData}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        trips={trips}
      />
    </>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-chip flex-shrink-0"
      style={{
        background: active ? "var(--accent)" : "var(--surface)",
        fontWeight: active ? 700 : 500,
      }}
    >
      {label}
    </button>
  );
}
