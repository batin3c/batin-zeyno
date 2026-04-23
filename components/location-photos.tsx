"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, X } from "lucide-react";
import {
  addLocationPhoto,
  removeLocationPhoto,
} from "@/app/actions/locations";

// small deterministic tilt per url so photos feel scattered, not sterile
function tiltFor(url: string, idx: number): number {
  let h = idx;
  for (let i = 0; i < url.length; i++) h = ((h << 5) - h + url.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 7) - 3) * 1.2;
}

export function LocationPhotos({
  locationId,
  tripId,
  urls,
}: {
  locationId: string;
  tripId: string;
  urls: string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    startTransition(async () => {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.set("location_id", locationId);
        fd.set("trip_id", tripId);
        fd.set("file", file);
        const r = await addLocationPhoto(fd);
        if (!r.ok) {
          setError(r.error ?? "Yükleme hatası");
          break;
        }
      }
    });
  };

  const onRemove = (url: string) => {
    if (!confirm("Fotoğraf silinsin mi?")) return;
    startTransition(() => removeLocationPhoto(locationId, tripId, url));
  };

  if (urls.length === 0 && !pending) {
    return (
      <>
        <button
          onClick={() => inputRef.current?.click()}
          className="mt-3 label-mono flex items-center gap-1.5 hover:text-[color:var(--ink)] transition-colors"
          style={{ color: "var(--ink-soft)" }}
        >
          <Camera size={11} strokeWidth={1.5} /> fotoğraf ekle
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onUpload(e.target.files)}
        />
      </>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex gap-4 overflow-x-auto -mx-4 px-4 py-2">
        {urls.map((u, i) => {
          const tilt = tiltFor(u, i);
          return (
            <div
              key={u}
              className="relative flex-shrink-0 group"
              style={{
                transform: `rotate(${tilt}deg)`,
              }}
            >
              <a
                href={u}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
                style={{
                  background: "color-mix(in srgb, var(--paper) 98%, #fff)",
                  padding: "6px 6px 22px",
                  boxShadow: `
                    0 1px 0 rgba(28,24,20,0.04),
                    0 4px 12px rgba(28,24,20,0.15)
                  `,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={u}
                  alt=""
                  className="w-24 h-24 object-cover"
                  style={{
                    filter: "saturate(0.92) contrast(1.02)",
                  }}
                />
              </a>
              <button
                onClick={() => onRemove(u)}
                className="absolute top-1 right-1 p-1 bg-[color:var(--paper)] text-[color:var(--ink)] opacity-0 group-hover:opacity-100 transition"
                aria-label="Sil"
                style={{ border: "1px solid var(--faded)" }}
              >
                <X size={10} strokeWidth={1.5} />
              </button>
            </div>
          );
        })}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="flex-shrink-0 w-[108px] h-[132px] flex flex-col items-center justify-center gap-1.5 hover:bg-[color:var(--paper-soft)] transition disabled:opacity-50"
          style={{
            border: "1px dashed var(--faded)",
          }}
          aria-label="Fotoğraf ekle"
        >
          <Camera size={18} strokeWidth={1.5} style={{ color: "var(--ink-soft)" }} />
          <span className="label-mono text-[0.6rem]">ekle</span>
        </button>
      </div>
      {error && (
        <p className="label-mono mt-1" style={{ color: "var(--stamp)" }}>
          {error}
        </p>
      )}
      {pending && (
        <p className="label-mono mt-1 opacity-60">yükleniyor…</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onUpload(e.target.files)}
      />
    </div>
  );
}
