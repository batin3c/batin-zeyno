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
  setCityCoverPhoto,
  setCityTrip,
  setCityIsPublic,
} from "@/app/actions/cities";
import type { VisitedCity, CityPhoto, Trip } from "@/lib/types";
import { PhotoGallery, type GalleryItem } from "./photo-gallery";
import { SharePostButton } from "./share-post-dialog";
import { CommunityCity } from "./community-city";

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
  trips = [],
}: {
  data: SelectedData | null;
  open: boolean;
  onClose: () => void;
  trips?: Trip[];
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
  void pending;

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

        <PublicToggle city={city} />

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

        {photos.length > 1 && (
          <CoverPicker
            cityId={city.id}
            photos={photos}
            currentCoverId={city.cover_photo_id}
          />
        )}

        <div className="mt-1">
          <SharePostButton
            refType="city"
            refId={city.id}
            existingPhotos={photos.map((p) => ({ id: p.id, url: p.url }))}
            buttonClassName="btn-primary w-full justify-center"
            buttonStyle={{ padding: "0.85rem 1.1rem" }}
          />
        </div>

        {trips.length > 0 && (
          <TripTagPicker
            cityId={city.id}
            currentTripId={city.trip_id}
            trips={trips}
          />
        )}

        <CommunityCity
          cityName={city.name}
          countryCode={city.country_code}
        />

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

function PublicToggle({ city }: { city: VisitedCity }) {
  const [pending, startTransition] = useTransition();
  const [isPublic, setIsPublic] = useState(city.is_public);
  const toggle = () => {
    if (pending) return;
    const next = !isPublic;
    setIsPublic(next);
    startTransition(async () => {
      const r = await setCityIsPublic(city.id, next);
      if (!r.ok) setIsPublic(!next);
    });
  };
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className="flex items-center justify-between gap-3 px-3.5 py-2.5"
      style={{
        background: isPublic ? "var(--accent-2-soft)" : "var(--surface)",
        border: "2px solid var(--ink)",
        borderRadius: "14px",
        color: "var(--ink)",
      }}
    >
      <div className="flex flex-col items-start">
        <span className="font-semibold text-[0.92rem]">
          {isPublic ? "topluluğa açık 🌍" : "sadece bizim grubumuza"}
        </span>
        <span
          className="text-[0.78rem]"
          style={{ color: "var(--text-muted)" }}
        >
          {isPublic
            ? "diğer baze kullanıcıları bu şehri topluluk önerilerinde görebilir"
            : "sadece grup içi · paylaşmak için tıkla"}
        </span>
      </div>
      <span
        className="flex items-center justify-center text-[0.85rem] font-bold"
        style={{
          minWidth: 44,
          padding: "0.3rem 0.7rem",
          background: isPublic ? "var(--accent-2)" : "var(--bg)",
          border: "1.5px solid var(--ink)",
          borderRadius: 999,
        }}
      >
        {isPublic ? "açık" : "kapalı"}
      </span>
    </button>
  );
}

function TripTagPicker({
  cityId,
  currentTripId,
  trips,
}: {
  cityId: string;
  currentTripId: string | null;
  trips: Trip[];
}) {
  const [pending, startTransition] = useTransition();
  const [picked, setPicked] = useState<string | null>(currentTripId);

  const choose = (id: string | null) => {
    if (pending) return;
    setPicked(id);
    startTransition(async () => {
      await setCityTrip(cityId, id);
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="label" style={{ fontSize: "0.62rem" }}>
        tatil etiketi
      </span>
      <div className="flex gap-1.5 overflow-x-auto -mx-5 px-5 pb-1">
        <ChipBtn
          active={picked === null}
          onClick={() => choose(null)}
          disabled={pending}
        >
          etiketsiz
        </ChipBtn>
        {trips.map((t) => (
          <ChipBtn
            key={t.id}
            active={picked === t.id}
            onClick={() => choose(t.id)}
            disabled={pending}
          >
            {t.name.toLowerCase()}
          </ChipBtn>
        ))}
      </div>
    </div>
  );
}

function ChipBtn({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn-chip flex-shrink-0 disabled:opacity-60"
      style={{
        background: active ? "var(--accent-2)" : "var(--surface)",
        fontWeight: active ? 600 : 500,
      }}
    >
      {children}
    </button>
  );
}

function CoverPicker({
  cityId,
  photos,
  currentCoverId,
}: {
  cityId: string;
  photos: CityPhoto[];
  currentCoverId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  // optimistic — flip immediately, server sync in background
  const [picked, setPicked] = useState<string | null>(currentCoverId);

  const choose = (id: string) => {
    if (pending) return;
    const next = picked === id ? null : id; // tap again → unset → fall back to default
    setPicked(next);
    startTransition(async () => {
      await setCityCoverPhoto(cityId, next);
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="label" style={{ fontSize: "0.62rem" }}>
        albüm kapağı
      </span>
      <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1">
        {photos.map((p) => {
          const isCover = picked === p.id || (picked === null && photos[0].id === p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => choose(p.id)}
              disabled={pending}
              className="relative flex-shrink-0 overflow-hidden p-0 disabled:opacity-60"
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                border: `2px solid ${isCover ? "var(--accent)" : "var(--ink)"}`,
                boxShadow: isCover ? "var(--shadow-pop-sm)" : "none",
                cursor: pending ? "default" : "pointer",
              }}
              aria-label={isCover ? "kapak" : "kapak yap"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt=""
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
              {isCover && (
                <span
                  className="absolute top-0.5 right-0.5 flex items-center justify-center text-[0.6rem] font-bold"
                  style={{
                    width: 18,
                    height: 18,
                    background: "var(--accent)",
                    border: "1.5px solid var(--ink)",
                    borderRadius: 999,
                    color: "var(--ink)",
                  }}
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
