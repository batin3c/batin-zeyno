"use client";

import { useMemo } from "react";
import { MapPin } from "lucide-react";
import { isoToFlag } from "@/lib/country-codes";
import type { VisitedCity, CityPhoto } from "@/lib/types";

export function AlbumGrid({
  cities,
  photos,
  onSelectCity,
}: {
  cities: VisitedCity[];
  photos: CityPhoto[];
  onSelectCity: (id: string) => void;
}) {
  const photosByCity = useMemo(() => {
    const m = new Map<string, CityPhoto[]>();
    for (const p of photos) {
      const arr = m.get(p.city_id) ?? [];
      arr.push(p);
      m.set(p.city_id, arr);
    }
    return m;
  }, [photos]);

  if (cities.length === 0) {
    return (
      <div
        className="flex flex-col items-center text-center gap-4 max-w-sm mx-auto anim-reveal mt-12"
        style={{
          background: "var(--surface)",
          border: "2px solid var(--ink)",
          borderRadius: "24px",
          boxShadow: "var(--shadow-pop)",
          padding: "2.5rem 1.5rem",
        }}
      >
        <div style={{ fontSize: "3.5rem", lineHeight: 1 }}>📸</div>
        <h3
          className="font-bold tracking-tight"
          style={{ fontSize: "1.3rem", color: "var(--ink)" }}
        >
          arşiv boş
        </h3>
        <p
          className="text-[0.9rem] leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          küreye dön, bir ülkeye tık, şehir ekle, foto at.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {cities.map((c, i) => {
        const cityPhotos = photosByCity.get(c.id) ?? [];
        const first = cityPhotos[0];
        const flag = c.country_code ? isoToFlag(c.country_code) : "📍";
        return (
          <button
            key={c.id}
            onClick={() => onSelectCity(c.id)}
            className="text-left overflow-hidden anim-reveal"
            style={{
              background: "var(--surface)",
              border: "2px solid var(--ink)",
              borderRadius: "18px",
              boxShadow: "var(--shadow-pop)",
              animationDelay: `${i * 40}ms`,
            }}
          >
            <div
              className="relative w-full aspect-square overflow-hidden"
              style={{
                background: "var(--accent-soft)",
                borderBottom: "2px solid var(--ink)",
              }}
            >
              {first ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={first.url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin
                    size={32}
                    strokeWidth={2}
                    style={{ color: "var(--accent)" }}
                  />
                </div>
              )}
              {cityPhotos.length > 1 && (
                <span
                  className="absolute top-2 right-2 flex items-center justify-center text-[0.7rem] font-bold"
                  style={{
                    minWidth: "24px",
                    height: "24px",
                    padding: "0 8px",
                    background: "var(--bg)",
                    border: "2px solid var(--ink)",
                    borderRadius: "999px",
                    color: "var(--ink)",
                    boxShadow: "1.5px 1.5px 0 var(--ink)",
                  }}
                >
                  {cityPhotos.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span style={{ fontSize: "1.15rem", lineHeight: 1 }}>{flag}</span>
              <span
                className="text-[0.92rem] font-semibold truncate flex-1"
                style={{ color: "var(--ink)" }}
              >
                {c.name}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
