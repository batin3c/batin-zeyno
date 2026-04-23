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
  category: Category;
  note: string;
};

const EMPTY: Draft = {
  name: "",
  address: "",
  lat: null,
  lng: null,
  category: "other",
  note: "",
};

export function AddLocationButton({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="j-btn-stamp fixed bottom-6 right-6 z-30"
        style={{
          paddingLeft: "1.1rem",
          paddingRight: "1.3rem",
          paddingTop: "0.85rem",
          paddingBottom: "0.85rem",
        }}
      >
        <Plus size={15} strokeWidth={2} />
        yer ekle
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
    fd.set("category", draft.category);
    fd.set("note", draft.note);
    startTransition(async () => {
      await createLocation(fd);
      onClose();
    });
  };

  return (
    <SimpleDialog open={true} onClose={onClose} title="yer ekle">
      <div className="flex gap-0 mb-5 border-b border-dashed" style={{ borderColor: "var(--faded)" }}>
        <Tab active={mode === "search"} onClick={() => setMode("search")}>
          <Search size={12} strokeWidth={1.8} /> ara
        </Tab>
        <Tab active={mode === "link"} onClick={() => setMode("link")}>
          <Link2 size={12} strokeWidth={1.8} /> link
        </Tab>
        <Tab active={mode === "manual"} onClick={() => setMode("manual")}>
          <PenLine size={12} strokeWidth={1.8} /> elle
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
          className="mt-5 p-3 font-serif italic"
          style={{
            background: "color-mix(in srgb, var(--mustard) 14%, transparent)",
            border: "1px dashed var(--mustard)",
          }}
        >
          <div className="text-base leading-tight text-[color:var(--ink)]">
            {draft.name || "(isimsiz)"}
          </div>
          {draft.address && (
            <div className="label-mono mt-1 normal-case tracking-normal font-sans not-italic">
              {draft.address}
            </div>
          )}
          <div className="label-mono mt-2">
            {draft.lat.toFixed(4)}, {draft.lng?.toFixed(4)}
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <div className="label-mono mb-2">kategori</div>
          <select
            value={draft.category}
            onChange={(e) =>
              setDraft({ ...draft, category: e.target.value as Category })
            }
            className="j-input"
            style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="label-mono mb-2">isim</div>
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="yer ismi"
            className="j-input"
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="label-mono mb-2">not</div>
        <textarea
          value={draft.note}
          onChange={(e) => setDraft({ ...draft, note: e.target.value })}
          rows={2}
          placeholder="&hellip;"
          className="j-textarea"
        />
      </div>

      <button
        onClick={submit}
        disabled={!ready || pending}
        className="j-btn-stamp mt-6 w-full"
        style={{ padding: "0.9rem 1.25rem" }}
      >
        {pending ? "ekleniyor…" : ready ? "ekle" : "önce bir konum seç"}
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
      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 font-mono text-[0.68rem] uppercase tracking-[0.18em] transition-colors"
      style={{
        color: active ? "var(--ink)" : "var(--ink-soft)",
        borderBottom: active ? "2px solid var(--stamp)" : "2px solid transparent",
        marginBottom: "-1px",
      }}
    >
      {children}
    </button>
  );
}

// Google Places Autocomplete — loads the Maps JS script on demand
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
      fields: ["place_id", "name", "formatted_address", "geometry", "url"],
    });
    const listener = ac.addListener("place_changed", () => {
      const p = ac.getPlace();
      if (!p.geometry?.location) return;
      pickRef.current({
        name: p.name ?? "",
        address: p.formatted_address ?? "",
        lat: p.geometry.location.lat(),
        lng: p.geometry.location.lng(),
        google_place_id: p.place_id ?? undefined,
        google_maps_url: p.url ?? undefined,
      });
    });
    return () => {
      listener.remove();
      google.maps.event.clearInstanceListeners(ac);
    };
  }, [isLoaded]);

  if (loadError) {
    return (
      <p className="font-serif italic text-sm p-4 text-center text-[color:var(--ink-soft)]">
        arama yüklenemedi. api anahtarı?
      </p>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        disabled={!isLoaded}
        placeholder={isLoaded ? "yer ara (roma colosseum, mikla…)" : "yükleniyor…"}
        className="j-input"
      />
      <p className="label-mono mt-3 normal-case tracking-normal font-sans text-[0.78rem]">
        <span className="label-mono">tip:</span>{" "}
        <span className="font-serif italic text-[color:var(--ink-soft)]">
          google önerilerinden seç — adres + koordinat otomatik gelir.
        </span>
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
        setError("link çözülemedi. url'i kontrol et.");
        return;
      }
      onResolved({
        name: r.name ?? "yeni yer",
        lat: r.lat,
        lng: r.lng,
        google_maps_url: url.trim(),
      });
    } catch {
      setError("bir şeyler ters gitti.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex gap-3 items-end">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://maps.app.goo.gl/…"
          className="j-input flex-1"
        />
        <button
          onClick={resolve}
          disabled={loading || !url.trim()}
          className="j-btn-stamp"
          style={{ padding: "0.55rem 0.9rem", fontSize: "0.68rem" }}
        >
          {loading ? "…" : "çöz"}
        </button>
      </div>
      {error && (
        <p
          className="label-mono mt-3"
          style={{ color: "var(--stamp)" }}
        >
          {error}
        </p>
      )}
      <p className="font-serif italic text-[color:var(--ink-soft)] text-sm mt-3 leading-snug">
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
        <div className="label-mono mb-2">adres</div>
        <input
          value={draft.address}
          onChange={(e) => setDraft({ ...draft, address: e.target.value })}
          className="j-input"
        />
      </div>
      <div>
        <div className="label-mono mb-2">enlem</div>
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
          className="j-input"
        />
      </div>
      <div>
        <div className="label-mono mb-2">boylam</div>
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
          className="j-input"
        />
      </div>
    </div>
  );
}
