"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, MapPin, Plus } from "lucide-react";
import { useJsApiLoader } from "@react-google-maps/api";
import { SimpleDialog } from "./simple-dialog";
import { COUNTRY_BY_NUMERIC, isoToFlag } from "@/lib/country-codes";
import {
  toggleVisitedCountry,
  updateCountryNote,
  addCountryPhoto,
  removeCountryPhoto,
  removeCountryPhotosBulk,
} from "@/app/actions/countries";
import { addCity } from "@/app/actions/cities";
import { PhotoGallery, type GalleryItem } from "./photo-gallery";
import type { VisitedCountry, CountryPhoto, VisitedCity } from "@/lib/types";

const LIBRARIES: ("places")[] = ["places"];

type SelectedData = {
  code: string;
  visited: VisitedCountry | null;
  photos: CountryPhoto[];
  cities: VisitedCity[];
};

function countryName(code: string): string {
  for (const entry of Object.values(COUNTRY_BY_NUMERIC)) {
    if (entry.iso2 === code) return entry.name;
  }
  return code;
}

export function CountrySheet({
  data,
  open,
  onClose,
  onOpenCity,
}: {
  data: SelectedData | null;
  open: boolean;
  onClose: () => void;
  onOpenCity: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [noteDraft, setNoteDraft] = useState<string>("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (data?.visited?.note !== undefined) {
      setNoteDraft(data.visited?.note ?? "");
    } else {
      setNoteDraft("");
    }
    setNoteSaved(false);
    setCityPickerOpen(false);
  }, [data?.code, data?.visited?.note]);

  if (!data) {
    return (
      <SimpleDialog open={open} onClose={onClose} title="">
        <div />
      </SimpleDialog>
    );
  }

  const { code, visited, photos, cities } = data;
  const isVisited = visited !== null;
  const name = countryName(code);
  const flag = isoToFlag(code);

  const onToggle = () => {
    if (isVisited) {
      const willLose = photos.length + cities.length;
      if (willLose > 0) {
        if (!confirm("tüm fotolar ve şehirler de gider. silsin mi?")) return;
      }
    }
    startTransition(async () => {
      await toggleVisitedCountry(code);
    });
  };

  const onNoteBlur = () => {
    const clean = noteDraft.trim();
    const current = visited?.note ?? "";
    if (clean === current) return;
    startTransition(async () => {
      if (!isVisited) {
        await toggleVisitedCountry(code);
      }
      await updateCountryNote(code, clean.length > 0 ? clean : null);
      setNoteSaved(true);
      if (noteTimer.current) clearTimeout(noteTimer.current);
      noteTimer.current = setTimeout(() => setNoteSaved(false), 1200);
    });
  };

  const onUpload = async (file: File) => {
    const fd = new FormData();
    fd.set("code", code);
    fd.set("file", file);
    return addCountryPhoto(fd);
  };

  const onRemove = async (id: string) => {
    return removeCountryPhoto(id);
  };

  const onRemoveBulk = async (ids: string[]) => {
    return removeCountryPhotosBulk(ids);
  };

  const galleryItems: GalleryItem[] = photos.map((p) => ({
    id: p.id,
    url: p.url,
  }));

  const onCityPicked = (city: {
    name: string;
    lat: number;
    lng: number;
    place_id?: string;
  }) => {
    startTransition(async () => {
      const r = await addCity({
        name: city.name,
        lat: city.lat,
        lng: city.lng,
        country_code: code,
        google_place_id: city.place_id ?? null,
      });
      if (r.ok) {
        setCityPickerOpen(false);
      }
    });
  };

  return (
    <SimpleDialog open={open} onClose={onClose} title="">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3 -mt-1">
          <span className="text-[2.2rem] leading-none">{flag}</span>
          <div className="flex-1 min-w-0">
            <h2 className="text-[1.25rem] font-semibold tracking-tight leading-tight truncate">
              {name}
            </h2>
            <span
              className="label"
              style={{ fontSize: "0.62rem", color: "var(--text-dim)" }}
            >
              {code}
            </span>
          </div>
          {isVisited && (
            <span className="pill pill-mint anim-pop">
              <Check size={12} strokeWidth={2.5} />
              gittik
            </span>
          )}
        </div>

        <button
          onClick={onToggle}
          disabled={pending}
          className={isVisited ? "btn-ghost" : "btn-primary"}
          style={{ width: "100%", padding: "0.9rem 1.25rem", fontSize: "1rem" }}
        >
          {pending
            ? "bir dakika aq…"
            : isVisited
            ? "yok burayı görmedik"
            : "burayı gördük"}
        </button>

        <label className="flex flex-col gap-1.5">
          <span className="label" style={{ fontSize: "0.62rem" }}>
            not {noteSaved && <span style={{ color: "var(--accent)" }}>✓</span>}
          </span>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={onNoteBlur}
            rows={2}
            placeholder={
              isVisited ? "nasıldı aq?" : "tık önce 'burayı gördük'e bas…"
            }
            disabled={!isVisited && pending}
            className="field-textarea"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="label" style={{ fontSize: "0.62rem" }}>
            şehirler {cities.length > 0 && <span style={{ color: "var(--ink)", fontWeight: 600 }}>· {cities.length}</span>}
          </span>
          {cities.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {cities.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onOpenCity(c.id)}
                  className="flex items-center gap-2 text-left w-full"
                  style={{
                    background: "var(--surface)",
                    border: "2px solid var(--ink)",
                    borderRadius: "12px",
                    padding: "0.55rem 0.85rem",
                    boxShadow: "var(--shadow-pop-sm)",
                    fontWeight: 600,
                    color: "var(--ink)",
                  }}
                >
                  <MapPin size={14} strokeWidth={2} style={{ color: "var(--accent-2)" }} />
                  <span className="text-[0.92rem] flex-1 truncate">{c.name}</span>
                </button>
              ))}
            </div>
          )}
          {cityPickerOpen ? (
            <CityPickerInline
              countryCode={code}
              onPicked={onCityPicked}
              onCancel={() => setCityPickerOpen(false)}
              pending={pending}
            />
          ) : (
            <button
              onClick={() => setCityPickerOpen(true)}
              disabled={pending}
              className="btn-ghost disabled:opacity-50"
              style={{ width: "100%" }}
            >
              <Plus size={16} strokeWidth={2.5} />
              şehir ekle
            </button>
          )}
        </div>

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
      </div>
    </SimpleDialog>
  );
}

function CityPickerInline({
  countryCode,
  onPicked,
  onCancel,
  pending,
}: {
  countryCode: string;
  onPicked: (p: { name: string; lat: number; lng: number; place_id?: string }) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: LIBRARIES,
    language: "tr",
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const pickedRef = useRef(onPicked);

  useEffect(() => {
    pickedRef.current = onPicked;
  }, [onPicked]);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;
    const ac = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ["name", "geometry", "place_id"],
      types: ["(cities)"],
      componentRestrictions: { country: countryCode.toLowerCase() },
    });
    const listener = ac.addListener("place_changed", () => {
      const p = ac.getPlace();
      if (!p.geometry?.location || !p.name) return;
      pickedRef.current({
        name: p.name,
        lat: p.geometry.location.lat(),
        lng: p.geometry.location.lng(),
        place_id: p.place_id ?? undefined,
      });
    });
    inputRef.current.focus();
    return () => {
      listener.remove();
      google.maps.event.clearInstanceListeners(ac);
    };
  }, [isLoaded, countryCode]);

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        className="field-input"
        placeholder={
          loadError
            ? "google gelmedi"
            : isLoaded
            ? "şehir yaz, seç…"
            : "yükleniyor…"
        }
        disabled={!isLoaded || pending}
      />
      <button
        type="button"
        onClick={onCancel}
        className="btn-chip self-start"
        style={{ background: "var(--surface-2)" }}
      >
        vazgeç
      </button>
    </div>
  );
}
