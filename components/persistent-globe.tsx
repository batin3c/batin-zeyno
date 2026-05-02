"use client";

import { usePathname } from "next/navigation";
import { GlobeClient } from "@/app/globe-client";
import type {
  VisitedCountry,
  CountryPhoto,
  VisitedCity,
  CityPhoto,
} from "@/lib/types";

export function PersistentGlobe({
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
      />
    </div>
  );
}
