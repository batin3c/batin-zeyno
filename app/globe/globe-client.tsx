"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { CountrySheet } from "@/components/country-sheet";
import type { VisitedCountry, CountryPhoto } from "@/lib/types";

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

// world-atlas 110m has ~177 countries after our code map filter
const TOTAL_COUNTRIES = 195;

export function GlobeClient({
  visited,
  photos,
}: {
  visited: VisitedCountry[];
  photos: CountryPhoto[];
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const visitedCodes = useMemo(
    () => new Set(visited.map((v) => v.code)),
    [visited]
  );

  const selectedData = useMemo(() => {
    if (!selected) return null;
    const v = visited.find((x) => x.code === selected) ?? null;
    const ps = photos.filter((p) => p.code === selected);
    return { code: selected, visited: v, photos: ps };
  }, [selected, visited, photos]);

  return (
    <div className="relative">
      <GlobeCanvas
        visitedCodes={visitedCodes}
        onSelect={(code) => setSelected(code)}
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
          ülke gezdik
        </span>
      </div>
      <CountrySheet
        data={selectedData}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
