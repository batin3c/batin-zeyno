"use client";

import { useRef, useState, useTransition } from "react";
import { MapPin, Trash2 } from "lucide-react";
import { SimpleDialog } from "./simple-dialog";
import { isoToFlag, COUNTRY_BY_NUMERIC } from "@/lib/country-codes";
import {
  updateCityNote,
  addCityPhoto,
  removeCityPhoto,
  removeCityPhotosBulk,
  deleteCity,
} from "@/app/actions/cities";
import type { VisitedCity, CityPhoto } from "@/lib/types";
import { PhotoGallery, type GalleryItem } from "./photo-gallery";

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
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // store-prop-in-state pattern from React 19 docs: keep the city id in
  // state alongside the draft, and resync the draft during render whenever
  // the parent opens a different city. No effect, no extra render.
  const cityId = data?.city?.id ?? null;
  const [lastCityId, setLastCityId] = useState<string | null>(cityId);
  const [noteDraft, setNoteDraft] = useState<string>(data?.city?.note ?? "");
  const [noteSaved, setNoteSaved] = useState(false);
  if (cityId !== lastCityId) {
    setLastCityId(cityId);
    setNoteDraft(data?.city?.note ?? "");
    setNoteSaved(false);
  }

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

  const onUpload = async (file: File) => {
    const fd = new FormData();
    fd.set("city_id", city.id);
    fd.set("file", file);
    return addCityPhoto(fd);
  };

  const onRemove = async (id: string) => removeCityPhoto(id);
  const onRemoveBulk = async (ids: string[]) => removeCityPhotosBulk(ids);

  const galleryItems: GalleryItem[] = photos.map((p) => ({
    id: p.id,
    url: p.url,
  }));

  const onDeleteCity = () => {
    if (
      !confirm(`"${city.name}" silinsin mi? tüm fotolar da gider.`)
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
            placeholder="nasıldı?"
            className="field-textarea"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="label" style={{ fontSize: "0.62rem" }}>
            fotolar
          </span>
          <PhotoGallery
            items={galleryItems}
            onUpload={onUpload}
            onRemove={onRemove}
            onRemoveBulk={onRemoveBulk}
            variant="sheet"
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
