"use client";

import { useState } from "react";
import { resolveShareUrl } from "@/app/actions/locations";
import type { Draft } from "./draft";

export function LinkInput({
  onResolved,
}: {
  onResolved: (d: Partial<Draft>) => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolve = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await resolveShareUrl(url.trim());
      if (!r) {
        setError("link anlaşılmadı. doğru mu yapıştırdın?");
        return;
      }
      onResolved({
        name: r.name ?? "Yeni yer",
        lat: r.lat,
        lng: r.lng,
        google_maps_url: url.trim(),
      });
    } catch {
      setError("bir şeyler yamuk oldu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex gap-2 items-end">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://maps.app.goo.gl/…"
          className="field-input flex-1"
        />
        <button
          onClick={resolve}
          disabled={loading || !url.trim()}
          className="btn-primary"
          style={{ padding: "0.6rem 0.95rem", fontSize: "0.8rem" }}
        >
          {loading ? "…" : "çöz"}
        </button>
      </div>
      {error && (
        <p className="text-[0.8rem] mt-3" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <p
        className="text-[0.8rem] mt-3 leading-relaxed"
        style={{ color: "var(--text-muted)" }}
      >
        google maps&apos;te yeri aç → paylaş → linki kopyala → yapıştır.
      </p>
    </div>
  );
}
