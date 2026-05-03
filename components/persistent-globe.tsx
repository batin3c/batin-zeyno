"use client";

import { usePathname } from "next/navigation";
import { GlobeClient } from "@/app/globe-client";
import type {
  VisitedCountry,
  CountryPhoto,
  VisitedCity,
  CityPhoto,
  Trip,
} from "@/lib/types";

export function PersistentGlobe({
  visited,
  photos,
  cities,
  cityPhotos,
  trips,
  currentMemberId,
}: {
  visited: VisitedCountry[];
  photos: CountryPhoto[];
  cities: VisitedCity[];
  cityPhotos: CityPhoto[];
  trips: Trip[];
  currentMemberId: string;
}) {
  const pathname = usePathname();
  const visible = pathname === "/";

  return (
    <div
      aria-hidden={!visible}
      style={{
        position: "fixed",
        top: "64px", // header height
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        visibility: visible ? "visible" : "hidden",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <GlobeClient
        visited={visited}
        photos={photos}
        cities={cities}
        cityPhotos={cityPhotos}
        trips={trips}
        currentMemberId={currentMemberId}
      />
    </div>
  );
}
