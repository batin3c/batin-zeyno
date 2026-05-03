"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Plus, Star } from "lucide-react";
import { useJsApiLoader } from "@react-google-maps/api";
import { SimpleDialog } from "./simple-dialog";
import { CATEGORIES, type Category } from "@/lib/types";
import { createLocationForCity } from "@/app/actions/locations";

const LIBRARIES: ("places")[] = ["places"];

type Picked = {
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  google_place_id: string | null;
};

export function AddLocationToCityButton({
  cityId,
  cityCenter,
  cityCountry,
  onAdded,
}: {
  cityId: string;
  cityCenter: { lat: number; lng: number };
  cityCountry: string | null;
  onAdded?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-chip"
        style={{
          background: "var(--accent-3)",
          fontWeight: 700,
        }}
      >
        <Plus size={14} strokeWidth={2.5} />
        mekan ekle
      </button>
      {open && (
        <AddLocationDialog
          cityId={cityId}
          cityCenter={cityCenter}
          cityCountry={cityCountry}
          onClose={() => setOpen(false)}
          onAdded={() => {
            setOpen(false);
            onAdded?.();
          }}
        />
      )}
    </>
  );
}

function AddLocationDialog({
  cityId,
  cityCenter,
  cityCountry,
  onClose,
  onAdded,
}: {
  cityId: string;
  cityCenter: { lat: number; lng: number };
  cityCountry: string | null;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [picked, setPicked] = useState<Picked | null>(null);
  const [category, setCategory] = useState<Category>("restaurant");
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    if (!picked) {
      setError("önce arama kutusundan bir yer seç");
      return;
    }
    startTransition(async () => {
      const r = await createLocationForCity(cityId, {
        name: picked.name,
        category,
        lat: picked.lat,
        lng: picked.lng,
        address: picked.address,
        google_place_id: picked.google_place_id,
        rating,
        note: note.trim() || null,
        is_public: isPublic,
      });
      if (!r.ok) {
        setError(r.error ?? "eklenmedi");
        return;
      }
      onAdded();
    });
  };

  void cityCountry;

  return (
    <SimpleDialog open onClose={onClose} title="mekan ekle">
      <div className="flex flex-col gap-4">
        <PlaceAutocomplete
          biasCenter={cityCenter}
          onPick={setPicked}
        />
        {picked && (
          <div
            className="flex flex-col gap-0.5 px-3 py-2"
            style={{
              background: "var(--accent-2-soft)",
              border: "2px solid var(--ink)",
              borderRadius: "12px",
            }}
          >
            <span className="font-semibold text-[0.95rem]">
              {picked.name}
            </span>
            {picked.address && (
              <span
                className="text-[0.78rem]"
                style={{ color: "var(--text-muted)" }}
              >
                {picked.address}
              </span>
            )}
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="label" style={{ fontSize: "0.62rem" }}>
            kategori
          </span>
          <div className="flex gap-1.5 overflow-x-auto -mx-5 px-5 pb-1">
            {CATEGORIES.map((c) => {
              const on = category === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key as Category)}
                  className="btn-chip flex-shrink-0"
                  style={{
                    background: on ? "var(--accent-2)" : "var(--surface)",
                    fontWeight: on ? 600 : 500,
                  }}
                >
                  <span>{c.emoji}</span>
                  <span>{c.label.toLowerCase()}</span>
                </button>
              );
            })}
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="label" style={{ fontSize: "0.62rem" }}>
            puan (opsiyonel)
          </span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(rating === n ? null : n)}
                aria-label={`${n} yıldız`}
                className="p-1"
                style={{ color: "var(--ink)" }}
              >
                <Star
                  size={22}
                  strokeWidth={2}
                  fill={rating !== null && n <= rating ? "var(--accent-3)" : "none"}
                />
              </button>
            ))}
            {rating !== null && (
              <button
                type="button"
                onClick={() => setRating(null)}
                className="text-[0.78rem] ml-2"
                style={{ color: "var(--text-dim)" }}
              >
                temizle
              </button>
            )}
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="label" style={{ fontSize: "0.62rem" }}>
            not (opsiyonel)
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={400}
            placeholder="ne dedin? ne yedin? nasıldı?"
            className="field-textarea"
          />
        </label>

        <button
          type="button"
          onClick={() => setIsPublic((v) => !v)}
          className="flex items-center justify-between gap-3 px-3.5 py-2.5"
          style={{
            background: isPublic ? "var(--accent-2-soft)" : "var(--surface)",
            border: "2px solid var(--ink)",
            borderRadius: "12px",
            color: "var(--ink)",
          }}
        >
          <span className="font-semibold text-[0.88rem]">
            {isPublic ? "topluluğa açık" : "sadece bizim grup"}
          </span>
          <span
            className="text-[0.78rem] font-bold"
            style={{
              padding: "0.2rem 0.55rem",
              background: isPublic ? "var(--accent-2)" : "var(--bg)",
              border: "1.5px solid var(--ink)",
              borderRadius: 999,
            }}
          >
            {isPublic ? "açık" : "kapalı"}
          </span>
        </button>

        {error && (
          <p
            className="text-[0.85rem]"
            style={{ color: "var(--danger)" }}
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={pending || !picked}
          className="btn-primary w-full justify-center"
          style={{ padding: "0.95rem 1.25rem" }}
        >
          {pending ? "ekleniyor…" : "ekle"}
        </button>
      </div>
    </SimpleDialog>
  );
}

function PlaceAutocomplete({
  biasCenter,
  onPick,
}: {
  biasCenter: { lat: number; lng: number };
  onPick: (p: Picked) => void;
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: LIBRARIES,
    language: "tr",
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef(onPick);
  useEffect(() => {
    pickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;
    // ~30km bbox around the city centroid
    const span = 0.3;
    const ac = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ["name", "formatted_address", "geometry", "place_id"],
      bounds: new google.maps.LatLngBounds(
        { lat: biasCenter.lat - span, lng: biasCenter.lng - span },
        { lat: biasCenter.lat + span, lng: biasCenter.lng + span }
      ),
      strictBounds: false,
    });
    const listener = ac.addListener("place_changed", () => {
      const p = ac.getPlace();
      if (!p.geometry?.location || !p.name) return;
      pickRef.current({
        name: p.name,
        address: p.formatted_address ?? null,
        lat: p.geometry.location.lat(),
        lng: p.geometry.location.lng(),
        google_place_id: p.place_id ?? null,
      });
    });
    return () => {
      listener.remove();
      google.maps.event.clearInstanceListeners(ac);
    };
  }, [isLoaded, biasCenter]);

  if (loadError) {
    return (
      <input
        type="text"
        placeholder="google yüklenmedi"
        disabled
        className="field-input"
      />
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      disabled={!isLoaded}
      placeholder={isLoaded ? "yer ara (Mikla, Güllüoğlu…)" : "google yükleniyor…"}
      className="field-input"
    />
  );
}
