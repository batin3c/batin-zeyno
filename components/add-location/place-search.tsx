"use client";

import { useEffect, useRef } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { pickCategoryFromGoogleTypes } from "@/lib/category-map";
import { LIBRARIES, type Draft } from "./draft";

export function PlaceSearch({
  onPick,
}: {
  onPick: (d: Partial<Draft>) => void;
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: LIBRARIES,
    language: "tr",
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef(onPick);

  useEffect(() => {
    pickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;
    const ac = new google.maps.places.Autocomplete(inputRef.current, {
      fields: [
        "place_id",
        "name",
        "formatted_address",
        "geometry",
        "url",
        "photos",
        "rating",
        "user_ratings_total",
        "types",
      ],
    });
    const listener = ac.addListener("place_changed", () => {
      const p = ac.getPlace();
      if (!p.geometry?.location) return;
      const photoUrls: string[] =
        p.photos
          ?.slice(0, 3)
          .map((ph) => {
            try {
              return ph.getUrl({ maxWidth: 1200 });
            } catch {
              return null;
            }
          })
          .filter((u): u is string => typeof u === "string" && u.length > 0) ??
        [];
      pickRef.current({
        name: p.name ?? "",
        address: p.formatted_address ?? "",
        lat: p.geometry.location.lat(),
        lng: p.geometry.location.lng(),
        google_place_id: p.place_id ?? undefined,
        google_maps_url: p.url ?? undefined,
        google_photo_urls: photoUrls,
        rating: typeof p.rating === "number" ? p.rating : null,
        rating_count:
          typeof p.user_ratings_total === "number"
            ? p.user_ratings_total
            : null,
        category: pickCategoryFromGoogleTypes(p.types),
      });
    });
    return () => {
      listener.remove();
      google.maps.event.clearInstanceListeners(ac);
    };
  }, [isLoaded]);

  if (loadError) {
    return (
      <p
        className="text-[0.9rem] p-4 text-center"
        style={{ color: "var(--text-muted)" }}
      >
        arama sıçtı. api key&apos;e bak.
      </p>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        disabled={!isLoaded}
        placeholder={isLoaded ? "yer ara (Roma Colosseum, Mikla…)" : "yükleniyor…"}
        className="field-input"
      />
      <p
        className="text-[0.8rem] mt-3 leading-relaxed"
        style={{ color: "var(--text-muted)" }}
      >
        google zaten söylüyor — adres, koordinat hepsi otomatik. uğraşma.
      </p>
    </div>
  );
}
