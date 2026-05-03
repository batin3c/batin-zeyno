"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Bookmark, MapPin, Star } from "lucide-react";
import { CATEGORIES } from "@/lib/types";
import {
  loadCommunityLocations,
  saveLocationToOurGroup,
  type CommunityLocation,
} from "@/app/actions/community";

type SaveState = "idle" | "saving" | "saved" | "error";

export function CommunityCity({
  cityName,
  countryCode,
}: {
  cityName: string;
  countryCode: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CommunityLocation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [, startTransition] = useTransition();
  const loading = open && !loaded;

  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    loadCommunityLocations({ cityName, countryCode }).then((r) => {
      if (cancelled) return;
      setItems(r.locations);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [open, loaded, cityName, countryCode]);

  const save = (id: string) => {
    setSaveStates((s) => ({ ...s, [id]: "saving" }));
    startTransition(async () => {
      const r = await saveLocationToOurGroup(id);
      setSaveStates((s) => ({
        ...s,
        [id]: r.ok ? "saved" : "error",
      }));
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-2 px-3.5 py-2.5"
        style={{
          background: open ? "var(--accent-3-soft)" : "var(--surface)",
          border: "2px solid var(--ink)",
          borderRadius: "14px",
          color: "var(--ink)",
        }}
      >
        <span className="flex items-center gap-2 font-semibold text-[0.92rem]">
          🌍 topluluk önerileri
          {loaded && items.length > 0 && (
            <span
              className="text-[0.78rem]"
              style={{ color: "var(--text-muted)" }}
            >
              · {items.length}
            </span>
          )}
        </span>
        {open ? (
          <ChevronUp size={16} strokeWidth={2.5} />
        ) : (
          <ChevronDown size={16} strokeWidth={2.5} />
        )}
      </button>

      {open && (
        <div className="flex flex-col gap-2 pt-1">
          {loading && (
            <p
              className="text-[0.85rem] text-center py-3"
              style={{ color: "var(--text-dim)" }}
            >
              yükleniyor…
            </p>
          )}
          {loaded && items.length === 0 && (
            <p
              className="text-[0.85rem] leading-relaxed text-center py-4"
              style={{ color: "var(--text-muted)" }}
            >
              bu şehir için henüz topluluk önerisi yok. ilk öneren sen ol —
              yerlerini topluluğa açabilirsin.
            </p>
          )}
          {items.map((l) => {
            const cat = CATEGORIES.find((c) => c.key === l.category);
            const photo =
              (l.photo_urls?.[0] ?? l.google_photo_urls?.[0]) || null;
            const state = saveStates[l.id] ?? "idle";
            return (
              <article
                key={l.id}
                className="flex gap-3 p-2.5"
                style={{
                  background: "var(--surface)",
                  border: "2px solid var(--ink)",
                  borderRadius: "14px",
                }}
              >
                <div
                  className="relative flex-shrink-0 overflow-hidden"
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 10,
                    background: "var(--bg)",
                    border: "1.5px solid var(--ink)",
                  }}
                >
                  {photo ? (
                    <Image
                      src={photo}
                      alt={l.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin
                        size={20}
                        strokeWidth={2}
                        style={{ color: "var(--accent)" }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span style={{ fontSize: "0.95rem" }}>
                      {cat?.emoji ?? "📍"}
                    </span>
                    <h4
                      className="font-semibold tracking-tight truncate"
                      style={{ fontSize: "0.95rem", color: "var(--ink)" }}
                    >
                      {l.name}
                    </h4>
                  </div>
                  <div
                    className="flex items-center gap-2 mt-0.5 text-[0.78rem]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {l.added_by_member && (
                      <Link
                        href={`/u/${l.added_by_member.id}`}
                        className="font-medium underline-offset-2 hover:underline"
                        style={{ color: "var(--text)" }}
                      >
                        {l.added_by_member.name.toLowerCase()}
                      </Link>
                    )}
                    {l.rating && (
                      <span className="flex items-center gap-0.5">
                        <Star
                          size={11}
                          fill="var(--accent-3)"
                          strokeWidth={2}
                        />
                        <span style={{ color: "var(--ink)", fontWeight: 700 }}>
                          {l.rating.toFixed(1)}
                        </span>
                      </span>
                    )}
                  </div>
                  {l.note && (
                    <p
                      className="text-[0.82rem] mt-1 line-clamp-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {l.note}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => save(l.id)}
                  disabled={state === "saving" || state === "saved"}
                  className="flex items-center justify-center self-start"
                  aria-label="kaydet"
                  style={{
                    width: 34,
                    height: 34,
                    background:
                      state === "saved"
                        ? "var(--accent-2)"
                        : state === "error"
                          ? "var(--danger-soft)"
                          : "var(--accent-3-soft)",
                    border: "2px solid var(--ink)",
                    borderRadius: 999,
                    color: "var(--ink)",
                    boxShadow: "var(--shadow-pop-sm)",
                  }}
                >
                  {state === "saved" ? (
                    "✓"
                  ) : (
                    <Bookmark size={14} strokeWidth={2.5} />
                  )}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
