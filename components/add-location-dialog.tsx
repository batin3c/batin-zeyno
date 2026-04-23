"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Plus, Search, Link2, PenLine, List, Star } from "lucide-react";
import { useJsApiLoader } from "@react-google-maps/api";
import { SimpleDialog } from "./simple-dialog";
import { CATEGORIES, type Category } from "@/lib/types";
import {
  createLocation,
  createLocationsBatch,
  resolveShareUrl,
  resolveGoogleListAction,
  type BatchLocationInput,
} from "@/app/actions/locations";
import type { GoogleListPlace } from "@/lib/google-list";

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
  rating: number | null;
  rating_count: number | null;
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
  rating: null,
  rating_count: null,
};

export function AddLocationButton({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-primary fixed safe-bottom right-6 z-30"
        style={{ padding: "0.85rem 1.35rem", fontSize: "0.95rem" }}
      >
        <Plus size={18} strokeWidth={2.5} />
        yer at
      </button>
      {open && (
        <AddLocationDialog tripId={tripId} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

type Mode = "search" | "link" | "manual" | "list";

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
    if (draft.rating !== null) fd.set("rating", String(draft.rating));
    if (draft.rating_count !== null) {
      fd.set("rating_count", String(draft.rating_count));
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
      <div className="flex gap-1.5 mb-5 flex-wrap">
        <Tab active={mode === "search"} onClick={() => setMode("search")}>
          <Search size={13} strokeWidth={2} /> ara
        </Tab>
        <Tab active={mode === "link"} onClick={() => setMode("link")}>
          <Link2 size={13} strokeWidth={2} /> link
        </Tab>
        <Tab active={mode === "manual"} onClick={() => setMode("manual")}>
          <PenLine size={13} strokeWidth={2} /> elle
        </Tab>
        <Tab active={mode === "list"} onClick={() => setMode("list")}>
          <List size={13} strokeWidth={2} /> liste
        </Tab>
      </div>

      {mode === "list" ? (
        <ListImport tripId={tripId} onDone={onClose} />
      ) : (
        <>
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
            background: "var(--accent-2-soft)",
            border: "2px solid var(--ink)",
            borderRadius: "14px",
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
          {draft.rating !== null && (
            <div
              className="text-[0.8rem] flex items-center gap-1 mt-1"
              style={{ color: "var(--text-muted)" }}
            >
              <Star size={11} fill="var(--accent)" strokeWidth={0} />
              <span style={{ color: "var(--text)" }}>
                {draft.rating.toFixed(1)}
              </span>
              {draft.rating_count !== null && (
                <span>· {formatCount(draft.rating_count)}</span>
              )}
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
        </>
      )}
    </SimpleDialog>
  );
}

export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
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
      className="btn-chip"
      style={{
        background: active ? "var(--accent-2)" : "var(--surface)",
        fontWeight: active ? 600 : 500,
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
        "rating",
        "user_ratings_total",
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
        rating: typeof p.rating === "number" ? p.rating : null,
        rating_count:
          typeof p.user_ratings_total === "number"
            ? p.user_ratings_total
            : null,
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

type EnrichedPlace = GoogleListPlace & {
  rating: number | null;
  rating_count: number | null;
  google_photo_urls: string[];
  selected: boolean;
};

function ListImport({
  tripId,
  onDone,
}: {
  tripId: string;
  onDone: () => void;
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: LIBRARIES,
    language: "tr",
  });
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [places, setPlaces] = useState<EnrichedPlace[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const fetchList = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setPlaces(null);
    setResultMsg(null);
    try {
      const r = await resolveGoogleListAction(url.trim());
      if (!r || r.places.length === 0) {
        setError("liste çözülemedi. doğru share linki mi bu?");
        setLoading(false);
        return;
      }
      const base: EnrichedPlace[] = r.places.map((p) => ({
        ...p,
        rating: null,
        rating_count: null,
        google_photo_urls: [],
        selected: true,
      }));
      setPlaces(base);
      setLoading(false);
      if (isLoaded) enrichPlaces(base);
    } catch {
      setError("bir şeyler yamuk oldu aq.");
      setLoading(false);
    }
  };

  const enrichPlaces = async (input: EnrichedPlace[]) => {
    if (typeof google === "undefined" || !google.maps?.places) return;
    setEnriching(true);
    const svc = new google.maps.places.PlacesService(
      document.createElement("div")
    );
    const detailsFields = ["rating", "user_ratings_total", "photos"];
    const enrichOne = (place: EnrichedPlace) =>
      new Promise<void>((resolve) => {
        if (!place.google_place_id) {
          resolve();
          return;
        }
        svc.getDetails(
          { placeId: place.google_place_id, fields: detailsFields },
          (res, status) => {
            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              res
            ) {
              const photoUrls =
                res.photos
                  ?.slice(0, 3)
                  .map((ph) => {
                    try {
                      return ph.getUrl({ maxWidth: 1200 });
                    } catch {
                      return null;
                    }
                  })
                  .filter(
                    (u): u is string =>
                      typeof u === "string" && u.length > 0
                  ) ?? [];
              const nextRating =
                typeof res.rating === "number" ? res.rating : null;
              const nextCount =
                typeof res.user_ratings_total === "number"
                  ? res.user_ratings_total
                  : null;
              setPlaces((prev) =>
                prev
                  ? prev.map((p) =>
                      p.google_place_id === place.google_place_id
                        ? {
                            ...p,
                            rating: nextRating,
                            rating_count: nextCount,
                            google_photo_urls: photoUrls,
                          }
                        : p
                    )
                  : prev
              );
            } else if (
              status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT
            ) {
              // soft retry after a short delay
              setTimeout(() => enrichOne(place).then(resolve), 400);
              return;
            }
            resolve();
          }
        );
      });
    // serialize 4 at a time
    const CONCURRENCY = 4;
    let cursor = 0;
    const workers = Array.from({ length: CONCURRENCY }, async () => {
      while (cursor < input.length) {
        const idx = cursor++;
        await enrichOne(input[idx]);
      }
    });
    await Promise.all(workers);
    setEnriching(false);
  };

  const toggle = (i: number) => {
    if (!places) return;
    const next = [...places];
    next[i] = { ...next[i], selected: !next[i].selected };
    setPlaces(next);
  };

  const importSelected = () => {
    if (!places) return;
    const picked = places.filter((p) => p.selected);
    if (picked.length === 0) return;
    const payload: BatchLocationInput[] = picked.map((p) => ({
      name: p.name,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      google_place_id: p.google_place_id,
      google_photo_urls: p.google_photo_urls,
      rating: p.rating,
      rating_count: p.rating_count,
    }));
    startTransition(async () => {
      const r = await createLocationsBatch(tripId, payload);
      if (!r.ok) {
        setResultMsg(r.error ?? "olmadı aq.");
        return;
      }
      setResultMsg(`${r.inserted} yer düştü`);
      setTimeout(onDone, 900);
    });
  };

  if (loadError) {
    return (
      <p
        className="text-[0.9rem] p-4 text-center"
        style={{ color: "var(--text-muted)" }}
      >
        google js yüklenmedi aq.
      </p>
    );
  }

  const selectedCount = places?.filter((p) => p.selected).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 items-end">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://maps.app.goo.gl/…"
          className="field-input flex-1"
        />
        <button
          onClick={fetchList}
          disabled={loading || !url.trim()}
          className="btn-primary"
          style={{ padding: "0.6rem 0.95rem", fontSize: "0.8rem" }}
        >
          {loading ? "…" : "çek"}
        </button>
      </div>
      {error && (
        <p className="text-[0.8rem]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      {!places && !error && (
        <p
          className="text-[0.8rem] leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          google maps listesinin share linkini yapıştır. tüm yerler çekilir,
          puan/foto google&apos;dan düşer.
        </p>
      )}
      {places && (
        <div
          className="flex flex-col"
          style={{
            border: "1px solid var(--line-soft)",
            borderRadius: "12px",
            overflow: "hidden",
            maxHeight: "50vh",
            overflowY: "auto",
          }}
        >
          {places.map((p, i) => (
            <label
              key={p.feature_id ?? `${p.lat},${p.lng}`}
              className="flex items-start gap-3 p-3 cursor-pointer"
              style={{
                borderBottom:
                  i === places.length - 1 ? "none" : "1px solid var(--line-soft)",
                background: p.selected ? "var(--accent-soft)" : "transparent",
              }}
            >
              <input
                type="checkbox"
                checked={p.selected}
                onChange={() => toggle(i)}
                className="mt-1 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div
                  className="text-[0.95rem] font-medium tracking-tight truncate"
                  style={{ color: "var(--text)" }}
                >
                  {p.name}
                </div>
                {p.address && (
                  <div
                    className="text-[0.75rem] mt-0.5 truncate"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {p.address}
                  </div>
                )}
                <div
                  className="flex items-center gap-2 mt-1 text-[0.7rem]"
                  style={{ color: "var(--text-dim)" }}
                >
                  {p.rating !== null && (
                    <span
                      className="flex items-center gap-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Star size={9} fill="var(--accent)" strokeWidth={0} />
                      <span style={{ color: "var(--text)" }}>
                        {p.rating.toFixed(1)}
                      </span>
                      {p.rating_count !== null && (
                        <span>· {formatCount(p.rating_count)}</span>
                      )}
                    </span>
                  )}
                  {p.google_photo_urls.length > 0 && (
                    <span>· {p.google_photo_urls.length} foto</span>
                  )}
                </div>
              </div>
            </label>
          ))}
        </div>
      )}
      {places && (
        <div className="flex items-center justify-between text-[0.75rem]">
          <span style={{ color: "var(--text-muted)" }}>
            {enriching
              ? "puan & foto çekiliyor…"
              : `${selectedCount}/${places.length} seçili`}
          </span>
        </div>
      )}
      {resultMsg && (
        <p
          className="text-[0.85rem] p-2.5"
          style={{
            color: "var(--accent)",
            background: "var(--accent-soft)",
            borderRadius: "8px",
          }}
        >
          {resultMsg}
        </p>
      )}
      {places && (
        <button
          onClick={importSelected}
          disabled={selectedCount === 0 || pending || enriching}
          className="btn-primary w-full"
          style={{ padding: "0.95rem 1.25rem" }}
        >
          {pending
            ? "atıyor aq…"
            : enriching
            ? "puan & foto bekle…"
            : selectedCount === 0
            ? "en az bir yer seç"
            : `${selectedCount} yeri at`}
        </button>
      )}
    </div>
  );
}
