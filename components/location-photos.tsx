"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, X } from "lucide-react";
import {
  addLocationPhoto,
  removeLocationPhoto,
} from "@/app/actions/locations";

export function LocationPhotos({
  locationId,
  tripId,
  urls,
  googleUrls = [],
}: {
  locationId: string;
  tripId: string;
  urls: string[];
  googleUrls?: string[];
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
          setError(r.error ?? "yüklenmedi aq");
          break;
        }
      }
    });
  };

  const onRemove = (url: string) => {
    if (!confirm("foto sikilsin mi?")) return;
    startTransition(() => removeLocationPhoto(locationId, tripId, url));
  };

  if (urls.length === 0 && googleUrls.length === 0 && !pending) {
    return (
      <>
        <button
          onClick={() => inputRef.current?.click()}
          className="btn-chip inline-flex"
          style={{ background: "var(--surface-soft)" }}
        >
          <Camera size={12} strokeWidth={2} />
          foto at
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
    <div className="mt-1">
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-0.5">
        {googleUrls.map((u) => (
          <div key={u} className="relative flex-shrink-0">
            <a
              href={u}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden"
              style={{
                borderRadius: "14px",
                border: "2px solid var(--ink)",
                boxShadow: "var(--shadow-pop-sm)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" loading="lazy" decoding="async" className="w-24 h-24 object-cover" />
            </a>
            <span
              className="absolute top-1.5 left-1.5 flex items-center justify-center text-[0.62rem] font-bold"
              style={{
                width: "22px",
                height: "22px",
                background: "var(--accent-3-soft)",
                border: "1.5px solid var(--ink)",
                borderRadius: "999px",
                color: "var(--ink)",
              }}
              title="Google fotoğrafı"
            >
              G
            </span>
          </div>
        ))}
        {urls.map((u) => (
          <div key={u} className="relative flex-shrink-0 group">
            <a
              href={u}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden"
              style={{
                borderRadius: "14px",
                border: "2px solid var(--ink)",
                boxShadow: "var(--shadow-pop-sm)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" loading="lazy" decoding="async" className="w-24 h-24 object-cover" />
            </a>
            <button
              onClick={() => onRemove(u)}
              className="absolute -top-2 -right-2 flex items-center justify-center opacity-100"
              style={{
                width: "26px",
                height: "26px",
                background: "var(--danger-soft)",
                border: "2px solid var(--ink)",
                borderRadius: "999px",
                color: "var(--ink)",
              }}
              aria-label="siktir et"
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </div>
        ))}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="flex-shrink-0 w-24 h-24 flex flex-col items-center justify-center gap-1 disabled:opacity-50"
          style={{
            border: "2px dashed var(--ink)",
            borderRadius: "14px",
            color: "var(--ink)",
            background: "var(--surface-soft)",
          }}
          aria-label="foto at"
        >
          <Camera size={18} strokeWidth={2} />
          <span className="text-[0.7rem] font-semibold">foto at</span>
        </button>
      </div>
      {error && (
        <p
          className="text-[0.75rem] mt-1"
          style={{ color: "var(--danger)" }}
        >
          {error}
        </p>
      )}
      {pending && (
        <p className="text-[0.75rem] mt-1" style={{ color: "var(--text-dim)" }}>
          yükleniyor…
        </p>
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
