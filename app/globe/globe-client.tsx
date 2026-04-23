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
        style={{ height: "calc(100dvh - 56px)", color: "var(--text-muted)" }}
      >
        <span className="label">dünya yükleniyor…</span>
      </div>
    ),
  }
);

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
    <>
      <GlobeCanvas
        visitedCodes={visitedCodes}
        onSelect={(code) => setSelected(code)}
      />
      <CountrySheet
        data={selectedData}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
