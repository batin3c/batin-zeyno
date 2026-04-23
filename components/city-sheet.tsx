"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, MapPin, Trash2, X } from "lucide-react";
import { SimpleDialog } from "./simple-dialog";
import { isoToFlag, COUNTRY_BY_NUMERIC } from "@/lib/country-codes";
import {
  updateCityNote,
  addCityPhoto,
  removeCityPhoto,
  deleteCity,
} from "@/app/actions/cities";
import type { VisitedCity, CityPhoto } from "@/lib/types";

type SelectedData = {
  city: VisitedCity;
  photos: CityPhoto[];
};

function countryName(code: string | null): string | null {
  if (!code) return null;
  for (const entry of Object.values(COUNTRY_BY_NUMERIC)) {
    if (entry.iso2 === code) return entry.name;
  }
  return code;
}

export function CitySheet({
  data,
  open,
  onClose,
}: {
  data: SelectedData | null;
  open: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>("");
  const [noteSaved, setNoteSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNoteDraft(data?.city?.note ?? "");
    setUploadErr(null);
    setNoteSaved(false);
  }, [data?.city?.id, data?.city?.note]);

  if (!data) {
    return (
      <SimpleDialog open={open} onClose={onClose} title="">
        <div />
      </SimpleDialog>
    );
  }

  const { city, photos } = data;
  const countryLabel = countryName(city.country_code);
  const flag = city.country_code ? isoToFlag(city.country_code) : "📍";

  const onNoteBlur = () => {
    const clean = noteDraft.trim();
    const current = city.note ?? "";
    if (clean === current) return;
    startTransition(async () => {
      await updateCityNote(city.id, clean.length > 0 ? clean : null);
      setNoteSaved(true);
      if (noteTimer.current) clearTimeout(noteTimer.current);
      noteTimer.current = setTimeout(() => setNoteSaved(false), 1200);
    });
  };

  const onUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadErr(null);
    startTransition(async () => {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.set("city_id", city.id);
        fd.set("file", file);
        const r = await addCityPhoto(fd);
        if (!r.ok) {
          setUploadErr(r.error ?? "yüklenmedi aq");
          break;
        }
      }
    });
  };

  const onRemovePhoto = (id: string) => {
    if (!confirm("foto sikilsin mi?")) return;
    startTransition(() => {
      removeCityPhoto(id);
    });
  };

  const onDeleteCity = () => {
    if (
      !confirm(`"${city.name}" sikilsin mi? tüm fotolar da gider aq.`)
    ) {
      return;
    }
    startTransition(async () => {
      await deleteCity(city.id);
      onClose();
    });
  };

  return (
    <SimpleDialog open={open} onClose={onClose} title="">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3 -mt-1">
          <span className="text-[2rem] leading-none">{flag}</span>
          <div className="flex-1 min-w-0">
            <h2 className="text-[1.3rem] font-bold tracking-tight leading-tight truncate">
              {city.name}
            </h2>
            <span
              className="label"
              style={{ fontSize: "0.62rem", color: "var(--text-dim)" }}
            >
              {countryLabel ? `${countryLabel} · şehir` : "şehir"}
            </span>
          </div>
          <span className="pill pill-mint">
            <MapPin size={12} strokeWidth={2.5} />
            gittik
          </span>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="label" style={{ fontSize: "0.62rem" }}>
            not {noteSaved && <span style={{ color: "var(--accent)" }}>✓</span>}
          </span>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={onNoteBlur}
            rows={2}
            placeholder="nasıldı aq?"
            className="field-textarea"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="label" style={{ fontSize: "0.62rem" }}>
            fotolar
          </span>
          {photos.length === 0 && (
            <p
              className="text-[0.8rem]"
              style={{ color: "var(--text-dim)" }}
            >
              daha foto yok. aşağıdan at.
            </p>
          )}
          {photos.length > 0 && (
            <div className="flex gap-2.5 overflow-x-auto -mx-5 px-5 pb-2 pt-1">
              {photos.map((p) => (
                <div key={p.id} className="relative flex-shrink-0">
                  <a
                    href={p.url}
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
                    <img
                      src={p.url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-24 h-24 object-cover"
                    />
                  </a>
                  <button
                    onClick={() => onRemovePhoto(p.id)}
                    className="absolute -top-2 -right-2 flex items-center justify-center"
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
            </div>
          )}
          <button
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="btn-ghost disabled:opacity-50"
            style={{ width: "100%" }}
          >
            <Camera size={16} strokeWidth={2} />
            foto at
          </button>
          {uploadErr && (
            <p
              className="text-[0.75rem] mt-0.5"
              style={{ color: "var(--danger)" }}
            >
              {uploadErr}
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

        <div
          className="mt-2 pt-4"
          style={{ borderTop: "2px solid var(--line-soft)" }}
        >
          <button
            type="button"
            onClick={onDeleteCity}
            disabled={pending}
            className="flex items-center justify-center gap-2 w-full py-2 text-[0.88rem] font-semibold transition-colors disabled:opacity-40"
            style={{ color: "var(--text-muted)" }}
          >
            <Trash2 size={14} strokeWidth={2} />
            şehri uçur
          </button>
        </div>
      </div>
    </SimpleDialog>
  );
}
