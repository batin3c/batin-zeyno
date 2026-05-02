"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { useJsApiLoader } from "@react-google-maps/api";
import {
  createLocationsBatch,
  resolveGoogleListAction,
  type BatchLocationInput,
} from "@/app/actions/locations";
import type { GoogleListPlace } from "@/lib/google-list";
import { pickCategoryFromGoogleTypes } from "@/lib/category-map";
import type { Category } from "@/lib/types";
import { LIBRARIES, formatCount } from "./draft";

type EnrichedPlace = GoogleListPlace & {
  rating: number | null;
  rating_count: number | null;
  google_photo_urls: string[];
  category: Category;
  selected: boolean;
};

export function ListImport({
  tripId,
  onDone,
}: {
  tripId: string;
  onDone: () => void;
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: LIBRARIES,
    language: "tr",
  });
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [places, setPlaces] = useState<EnrichedPlace[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const fetchList = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setPlaces(null);
    setResultMsg(null);
    try {
      const r = await resolveGoogleListAction(url.trim());
      if (!r || r.places.length === 0) {
        setError("liste çözülemedi. doğru share linki mi bu?");
        setLoading(false);
        return;
      }
      const base: EnrichedPlace[] = r.places.map((p) => ({
        ...p,
        rating: null,
        rating_count: null,
        google_photo_urls: [],
        category: "other",
        selected: true,
      }));
      setPlaces(base);
      setLoading(false);
      if (isLoaded) enrichPlaces(base);
    } catch {
      setError("bir şeyler yamuk oldu.");
      setLoading(false);
    }
  };

  const enrichPlaces = async (input: EnrichedPlace[]) => {
    if (typeof google === "undefined" || !google.maps?.places) return;
    setEnriching(true);
    const svc = new google.maps.places.PlacesService(
      document.createElement("div")
    );
    const detailsFields = ["rating", "user_ratings_total", "photos", "types"];
    const enrichOne = (place: EnrichedPlace) =>
      new Promise<void>((resolve) => {
        if (!place.google_place_id) {
          resolve();
          return;
        }
        svc.getDetails(
          { placeId: place.google_place_id, fields: detailsFields },
          (res, status) => {
            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              res
            ) {
              const photoUrls =
                res.photos
                  ?.slice(0, 3)
                  .map((ph) => {
                    try {
                      return ph.getUrl({ maxWidth: 1200 });
                    } catch {
                      return null;
                    }
                  })
                  .filter(
                    (u): u is string =>
                      typeof u === "string" && u.length > 0
                  ) ?? [];
              const nextRating =
                typeof res.rating === "number" ? res.rating : null;
              const nextCount =
                typeof res.user_ratings_total === "number"
                  ? res.user_ratings_total
                  : null;
              const nextCategory = pickCategoryFromGoogleTypes(res.types);
              setPlaces((prev) =>
                prev
                  ? prev.map((p) =>
                      p.google_place_id === place.google_place_id
                        ? {
                            ...p,
                            rating: nextRating,
                            rating_count: nextCount,
                            google_photo_urls: photoUrls,
                            category: nextCategory,
                          }
                        : p
                    )
                  : prev
              );
            } else if (
              status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT
            ) {
              setTimeout(() => enrichOne(place).then(resolve), 400);
              return;
            }
            resolve();
          }
        );
      });
    const CONCURRENCY = 4;
    let cursor = 0;
    const workers = Array.from({ length: CONCURRENCY }, async () => {
      while (cursor < input.length) {
        const idx = cursor++;
        await enrichOne(input[idx]);
      }
    });
    await Promise.all(workers);
    setEnriching(false);
  };

  const toggle = (i: number) => {
    if (!places) return;
    const next = [...places];
    next[i] = { ...next[i], selected: !next[i].selected };
    setPlaces(next);
  };

  const importSelected = () => {
    if (!places) return;
    const picked = places.filter((p) => p.selected);
    if (picked.length === 0) return;
    const payload: BatchLocationInput[] = picked.map((p) => ({
      name: p.name,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      google_place_id: p.google_place_id,
      google_photo_urls: p.google_photo_urls,
      rating: p.rating,
      rating_count: p.rating_count,
      category: p.category,
    }));
    startTransition(async () => {
      const r = await createLocationsBatch(tripId, payload);
      if (!r.ok) {
        setResultMsg(r.error ?? "olmadı.");
        return;
      }
      setResultMsg(`${r.inserted} yer düştü`);
      setTimeout(onDone, 900);
    });
  };

  if (loadError) {
    return (
      <p
        className="text-[0.9rem] p-4 text-center"
        style={{ color: "var(--text-muted)" }}
      >
        google js yüklenmedi.
      </p>
    );
  }

  const selectedCount = places?.filter((p) => p.selected).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 items-end">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://maps.app.goo.gl/…"
          className="field-input flex-1"
        />
        <button
          onClick={fetchList}
          disabled={loading || !url.trim()}
          className="btn-primary"
          style={{ padding: "0.6rem 0.95rem", fontSize: "0.8rem" }}
        >
          {loading ? "…" : "çek"}
        </button>
      </div>
      {error && (
        <p className="text-[0.8rem]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      {!places && !error && (
        <p
          className="text-[0.8rem] leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          google maps listesinin share linkini yapıştır. tüm yerler çekilir,
          puan/foto google&apos;dan düşer.
        </p>
      )}
      {places && (
        <div
          className="flex flex-col"
          style={{
            border: "1px solid var(--line-soft)",
            borderRadius: "12px",
            overflow: "hidden",
            maxHeight: "50vh",
            overflowY: "auto",
          }}
        >
          {places.map((p, i) => (
            <label
              key={p.feature_id ?? `${p.lat},${p.lng}`}
              className="flex items-start gap-3 p-3 cursor-pointer"
              style={{
                borderBottom:
                  i === places.length - 1 ? "none" : "1px solid var(--line-soft)",
                background: p.selected ? "var(--accent-soft)" : "transparent",
              }}
            >
              <input
                type="checkbox"
                checked={p.selected}
                onChange={() => toggle(i)}
                className="mt-1 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div
                  className="text-[0.95rem] font-medium tracking-tight truncate"
                  style={{ color: "var(--text)" }}
                >
                  {p.name}
                </div>
                {p.address && (
                  <div
                    className="text-[0.75rem] mt-0.5 truncate"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {p.address}
                  </div>
                )}
                <div
                  className="flex items-center gap-2 mt-1 text-[0.7rem]"
                  style={{ color: "var(--text-dim)" }}
                >
                  {p.rating !== null && (
                    <span
                      className="flex items-center gap-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Star size={9} fill="var(--accent)" strokeWidth={0} />
                      <span style={{ color: "var(--text)" }}>
                        {p.rating.toFixed(1)}
                      </span>
                      {p.rating_count !== null && (
                        <span>· {formatCount(p.rating_count)}</span>
                      )}
                    </span>
                  )}
                  {p.google_photo_urls.length > 0 && (
                    <span>· {p.google_photo_urls.length} foto</span>
                  )}
                </div>
              </div>
            </label>
          ))}
        </div>
      )}
      {places && (
        <div className="flex items-center justify-between text-[0.75rem]">
          <span style={{ color: "var(--text-muted)" }}>
            {enriching
              ? "puan & foto çekiliyor…"
              : `${selectedCount}/${places.length} seçili`}
          </span>
        </div>
      )}
      {resultMsg && (
        <p
          className="text-[0.85rem] p-2.5"
          style={{
            color: "var(--accent)",
            background: "var(--accent-soft)",
            borderRadius: "8px",
          }}
        >
          {resultMsg}
        </p>
      )}
      {places && (
        <button
          onClick={importSelected}
          disabled={selectedCount === 0 || pending || enriching}
          className="btn-primary w-full"
          style={{ padding: "0.95rem 1.25rem" }}
        >
          {pending
            ? "atılıyor…"
            : enriching
            ? "puan & foto bekle…"
            : selectedCount === 0
            ? "en az bir yer seç"
            : `${selectedCount} yeri at`}
        </button>
      )}
    </div>
  );
}
