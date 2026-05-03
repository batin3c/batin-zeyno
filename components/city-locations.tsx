"use client";

import { useEffect, useState, useTransition } from "react";
import { Star, Trash2 } from "lucide-react";
import {
  loadCityLocations,
  deleteLocation,
  type CityLocationLite,
} from "@/app/actions/locations";
import { CATEGORIES } from "@/lib/types";
import { AddLocationToCityButton } from "./add-location-to-city-dialog";

export function CityLocations({
  cityId,
  cityCenter,
  cityCountry,
  currentMemberId,
}: {
  cityId: string;
  cityCenter: { lat: number; lng: number };
  cityCountry: string | null;
  currentMemberId: string;
}) {
  // null = loading, [] = loaded but empty, non-empty = loaded with items.
  // store-prop-in-state pattern: when cityId changes mid-render reset items
  // to null so we re-load — no setState-in-effect.
  const [items, setItems] = useState<CityLocationLite[] | null>(null);
  const [lastCityId, setLastCityId] = useState(cityId);
  if (cityId !== lastCityId) {
    setLastCityId(cityId);
    setItems(null);
  }
  const loaded = items !== null;
  const [, startTx] = useTransition();

  useEffect(() => {
    if (items !== null) return;
    let cancelled = false;
    loadCityLocations(cityId).then((r) => {
      if (cancelled) return;
      setItems(r.locations);
    });
    return () => {
      cancelled = true;
    };
  }, [cityId, items]);

  const refresh = () => {
    setItems(null);
  };

  const remove = (id: string, tripId: string | null) => {
    if (!confirm("mekanı silelim mi?")) return;
    startTx(async () => {
      if (!tripId) {
        // city-only locations have no trip; deleteLocation API needs trip_id.
        // safer to do nothing here than leak a half-delete. ui hides the
        // delete button when trip_id is null.
        return;
      }
      const r = await deleteLocation(id, tripId);
      void r;
      setItems((arr) => (arr ? arr.filter((l) => l.id !== id) : arr));
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="label" style={{ fontSize: "0.62rem" }}>
          mekanlar {loaded && items && items.length > 0 && `(${items.length})`}
        </span>
        <AddLocationToCityButton
          cityId={cityId}
          cityCenter={cityCenter}
          cityCountry={cityCountry}
          onAdded={refresh}
        />
      </div>
      {!loaded && (
        <p className="text-[0.85rem]" style={{ color: "var(--text-dim)" }}>
          yükleniyor…
        </p>
      )}
      {loaded && items && items.length === 0 && (
        <p
          className="text-[0.85rem] leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          bu şehre henüz mekan eklenmedi. yukarıdan ekleyebilirsin.
        </p>
      )}
      {(items ?? []).map((l) => {
        const cat = CATEGORIES.find((c) => c.key === l.category);
        const canDelete = l.added_by === currentMemberId && !!l.trip_id;
        return (
          <article
            key={l.id}
            className="flex items-center gap-2 px-2.5 py-2"
            style={{
              background: "var(--surface)",
              border: "2px solid var(--ink)",
              borderRadius: "12px",
            }}
          >
            <span style={{ fontSize: "1.05rem" }}>{cat?.emoji ?? "📍"}</span>
            <div className="flex-1 min-w-0">
              <span
                className="block text-[0.92rem] font-semibold truncate"
                style={{ color: "var(--ink)" }}
              >
                {l.name}
              </span>
              {l.address && (
                <span
                  className="block text-[0.78rem] truncate"
                  style={{ color: "var(--text-muted)" }}
                >
                  {l.address}
                </span>
              )}
            </div>
            {l.rating != null && l.rating > 0 && (
              <span
                className="flex items-center gap-0.5 text-[0.78rem] font-bold"
                style={{ color: "var(--ink)" }}
              >
                <Star size={11} fill="var(--accent-3)" strokeWidth={2} />
                {l.rating.toFixed(1)}
              </span>
            )}
            {l.is_public && (
              <span
                className="text-[0.65rem] font-bold uppercase tracking-wider"
                style={{
                  padding: "0.15rem 0.45rem",
                  background: "var(--accent-2-soft)",
                  border: "1.5px solid var(--ink)",
                  borderRadius: 999,
                  color: "var(--ink)",
                }}
              >
                topluluk
              </span>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => remove(l.id, l.trip_id)}
                className="p-1 opacity-50 hover:opacity-100"
                style={{ color: "var(--text-muted)" }}
                aria-label="sil"
              >
                <Trash2 size={13} strokeWidth={2} />
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}
