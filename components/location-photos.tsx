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

  if (urls.length === 0 && !pending) {
    return (
      <>
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 text-[0.75rem] font-medium mt-2 transition-colors"
          style={{ color: "var(--text-dim)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--text)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--text-dim)")
          }
        >
          <Camera size={12} strokeWidth={1.75} />
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
        {urls.map((u) => (
          <div key={u} className="relative flex-shrink-0 group">
            <a
              href={u}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden"
              style={{ borderRadius: "10px" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={u}
                alt=""
                className="w-24 h-24 object-cover"
              />
            </a>
            <button
              onClick={() => onRemove(u)}
              className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: "color-mix(in srgb, var(--text) 75%, transparent)",
                borderRadius: "999px",
                color: "var(--bg)",
              }}
              aria-label="siktir et"
            >
              <X size={11} strokeWidth={2} />
            </button>
          </div>
        ))}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="flex-shrink-0 w-24 h-24 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
          style={{
            border: "1px solid var(--line)",
            borderRadius: "10px",
            color: "var(--text-muted)",
            background: "var(--surface)",
          }}
          aria-label="foto at"
        >
          <Camera size={16} strokeWidth={1.5} />
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
