"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Plus, Search, Link2, PenLine } from "lucide-react";
import { useJsApiLoader } from "@react-google-maps/api";
import { SimpleDialog } from "./simple-dialog";
import { CATEGORIES, type Category } from "@/lib/types";
import { createLocation, resolveShareUrl } from "@/app/actions/locations";

const LIBRARIES: ("places")[] = ["places"];

type Draft = {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  google_place_id?: string;
  google_maps_url?: string;
  google_photo_urls: string[];
  category: Category;
  note: string;
  visit_date: string;
};

const EMPTY: Draft = {
  name: "",
  address: "",
  lat: null,
  lng: null,
  google_photo_urls: [],
  category: "other",
  note: "",
  visit_date: "",
};

export function AddLocationButton({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-primary fixed bottom-6 right-6 z-30"
        style={{
          boxShadow:
            "0 10px 30px -8px color-mix(in srgb, var(--accent) 60%, transparent), 0 4px 8px -4px color-mix(in srgb, var(--text) 20%, transparent)",
        }}
      >
        <Plus size={16} strokeWidth={2} />
        yer at
      </button>
      {open && (
        <AddLocationDialog tripId={tripId} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

type Mode = "search" | "link" | "manual";

function AddLocationDialog({
  tripId,
  onClose,
  initialDraft,
}: {
  tripId: string;
  onClose: () => void;
  initialDraft?: Partial<Draft>;
}) {
  const [mode, setMode] = useState<Mode>("search");
  const [draft, setDraft] = useState<Draft>({ ...EMPTY, ...initialDraft });
  const [pending, startTransition] = useTransition();
  const ready = draft.name.trim().length > 0 && draft.lat !== null;

  const submit = () => {
    if (!ready) return;
    const fd = new FormData();
    fd.set("trip_id", tripId);
    fd.set("name", draft.name);
    fd.set("address", draft.address);
    fd.set("lat", String(draft.lat));
    fd.set("lng", String(draft.lng));
    if (draft.google_place_id) fd.set("google_place_id", draft.google_place_id);
    if (draft.google_maps_url) fd.set("google_maps_url", draft.google_maps_url);
    if (draft.google_photo_urls.length > 0) {
      fd.set("google_photo_urls", JSON.stringify(draft.google_photo_urls));
    }
    fd.set("category", draft.category);
    fd.set("note", draft.note);
    if (draft.visit_date) fd.set("visit_date", draft.visit_date);
    startTransition(async () => {
      await createLocation(fd);
      onClose();
    });
  };

  return (
    <SimpleDialog open={true} onClose={onClose} title="yer at">
      <div
        className="flex p-0.5 mb-5"
        style={{
          background: "var(--surface-2)",
          borderRadius: "10px",
        }}
      >
        <Tab active={mode === "search"} onClick={() => setMode("search")}>
          <Search size={12} strokeWidth={1.75} /> ara
        </Tab>
        <Tab active={mode === "link"} onClick={() => setMode("link")}>
          <Link2 size={12} strokeWidth={1.75} /> link
        </Tab>
        <Tab active={mode === "manual"} onClick={() => setMode("manual")}>
          <PenLine size={12} strokeWidth={1.75} /> elle
        </Tab>
      </div>

      {mode === "search" && (
        <PlaceSearch onPick={(d) => setDraft({ ...draft, ...d })} />
      )}
      {mode === "link" && (
        <LinkInput onResolved={(d) => setDraft({ ...draft, ...d })} />
      )}
      {mode === "manual" && <ManualFields draft={draft} setDraft={setDraft} />}

      {draft.lat !== null && (
        <div
          className="mt-5 p-3 flex flex-col gap-1"
          style={{
            background: "var(--accent-soft)",
            borderRadius: "10px",
          }}
        >
          <div
            className="text-[0.95rem] font-medium tracking-tight"
            style={{ color: "var(--text)" }}
          >
            {draft.name || "(isimsiz)"}
          </div>
          {draft.address && (
            <div
              className="text-[0.8rem]"
              style={{ color: "var(--text-muted)" }}
            >
              {draft.address}
            </div>
          )}
          {draft.google_photo_urls.length > 0 && (
            <div className="flex gap-1.5 mt-2 -mx-1 overflow-x-auto">
              {draft.google_photo_urls.map((u) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={u}
                  src={u}
                  alt=""
                  className="w-16 h-16 object-cover flex-shrink-0"
                  style={{ borderRadius: "8px" }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <div className="label mb-2" style={{ fontSize: "0.62rem" }}>
            kategori
          </div>
          <select
            value={draft.category}
            onChange={(e) =>
              setDraft({ ...draft, category: e.target.value as Category })
            }
            className="field-select"
          >
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="label mb-2" style={{ fontSize: "0.62rem" }}>
            isim
          </div>
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="yer ismi"
            className="field-input"
          />
        </div>
      </div>

      <div className="mt-5">
        <div className="label mb-2" style={{ fontSize: "0.62rem" }}>
          tarih
        </div>
        <input
          type="date"
          value={draft.visit_date}
          onChange={(e) => setDraft({ ...draft, visit_date: e.target.value })}
          className="field-input"
        />
      </div>

      <div className="mt-5">
        <div className="label mb-2" style={{ fontSize: "0.62rem" }}>
          not
        </div>
        <textarea
          value={draft.note}
          onChange={(e) => setDraft({ ...draft, note: e.target.value })}
          rows={2}
          placeholder="…"
          className="field-textarea"
        />
      </div>

      <button
        onClick={submit}
        disabled={!ready || pending}
        className="btn-primary w-full mt-6"
        style={{ padding: "0.95rem 1.25rem" }}
      >
        {pending ? "atıyor aq…" : ready ? "at" : "önce bir yer seç aq"}
      </button>
    </SimpleDialog>
  );
}

function Tab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[0.78rem] font-medium transition-all duration-200"
      style={{
        color: active ? "var(--text)" : "var(--text-muted)",
        background: active ? "var(--bg)" : "transparent",
        borderRadius: "8px",
        boxShadow: active
          ? "0 1px 3px -1px color-mix(in srgb, var(--text) 20%, transparent)"
          : "none",
      }}
    >
      {children}
    </button>
  );
}

function PlaceSearch({
  onPick,
}: {
  onPick: (d: Partial<Draft>) => void;
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
    const ac = new google.maps.places.Autocomplete(inputRef.current, {
      fields: [
        "place_id",
        "name",
        "formatted_address",
        "geometry",
        "url",
        "photos",
      ],
    });
    const listener = ac.addListener("place_changed", () => {
      const p = ac.getPlace();
      if (!p.geometry?.location) return;
      const photoUrls: string[] =
        p.photos
          ?.slice(0, 3)
          .map((ph) => {
            try {
              return ph.getUrl({ maxWidth: 1200 });
            } catch {
              return null;
            }
          })
          .filter((u): u is string => typeof u === "string" && u.length > 0) ??
        [];
      pickRef.current({
        name: p.name ?? "",
        address: p.formatted_address ?? "",
        lat: p.geometry.location.lat(),
        lng: p.geometry.location.lng(),
        google_place_id: p.place_id ?? undefined,
        google_maps_url: p.url ?? undefined,
        google_photo_urls: photoUrls,
      });
    });
    return () => {
      listener.remove();
      google.maps.event.clearInstanceListeners(ac);
    };
  }, [isLoaded]);

  if (loadError) {
    return (
      <p
        className="text-[0.9rem] p-4 text-center"
        style={{ color: "var(--text-muted)" }}
      >
        arama sıçtı. api key&apos;e bak.
      </p>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        disabled={!isLoaded}
        placeholder={isLoaded ? "yer ara (Roma Colosseum, Mikla…)" : "yükleniyor…"}
        className="field-input"
      />
      <p
        className="text-[0.8rem] mt-3 leading-relaxed"
        style={{ color: "var(--text-muted)" }}
      >
        google zaten söylüyor — adres, koordinat hepsi otomatik. uğraşma.
      </p>
    </div>
  );
}

function LinkInput({
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
        setError("link anlaşılmadı aq. doğru mu yapıştırdın?");
        return;
      }
      onResolved({
        name: r.name ?? "Yeni yer",
        lat: r.lat,
        lng: r.lng,
        google_maps_url: url.trim(),
      });
    } catch {
      setError("bir şeyler yamuk oldu aq.");
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

function ManualFields({
  draft,
  setDraft,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <div className="label mb-2" style={{ fontSize: "0.62rem" }}>
          adres
        </div>
        <input
          value={draft.address}
          onChange={(e) => setDraft({ ...draft, address: e.target.value })}
          className="field-input"
        />
      </div>
      <div>
        <div className="label mb-2" style={{ fontSize: "0.62rem" }}>
          enlem
        </div>
        <input
          type="number"
          step="any"
          value={draft.lat ?? ""}
          onChange={(e) =>
            setDraft({
              ...draft,
              lat: e.target.value ? parseFloat(e.target.value) : null,
            })
          }
          className="field-input"
        />
      </div>
      <div>
        <div className="label mb-2" style={{ fontSize: "0.62rem" }}>
          boylam
        </div>
        <input
          type="number"
          step="any"
          value={draft.lng ?? ""}
          onChange={(e) =>
            setDraft({
              ...draft,
              lng: e.target.value ? parseFloat(e.target.value) : null,
            })
          }
          className="field-input"
        />
      </div>
    </div>
  );
}
