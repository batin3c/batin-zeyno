"use client";

import { useEffect, useState, useTransition } from "react";
import { Send, Heart, Star } from "lucide-react";
import { SimpleDialog } from "./simple-dialog";
import { createPost } from "@/app/actions/posts";
import { CATEGORIES, type Category, type PostRefType } from "@/lib/types";

type PhotoOption = { url: string; id?: string };

export type LocationOption = {
  id: string;
  name: string;
  category: Category;
  rating?: number | null;
};

export function SharePostButton({
  refType,
  refId,
  existingPhotos = [],
  loadLocations,
  label = "akışta paylaş",
  buttonClassName = "btn-primary",
  buttonStyle,
  onShared,
}: {
  refType: PostRefType;
  refId: string;
  existingPhotos?: PhotoOption[];
  /** city posts only: lazy load location options for multi-select */
  loadLocations?: () => Promise<LocationOption[]>;
  label?: string;
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
  onShared?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClassName}
        style={buttonStyle}
      >
        <Heart size={14} strokeWidth={2.5} />
        {label}
      </button>
      {open && (
        <SharePostDialog
          refType={refType}
          refId={refId}
          existingPhotos={existingPhotos}
          loadLocations={loadLocations}
          onClose={() => setOpen(false)}
          onShared={() => {
            setOpen(false);
            onShared?.();
          }}
        />
      )}
    </>
  );
}

function SharePostDialog({
  refType,
  refId,
  existingPhotos,
  loadLocations,
  onClose,
  onShared,
}: {
  refType: PostRefType;
  refId: string;
  existingPhotos: PhotoOption[];
  loadLocations?: () => Promise<LocationOption[]>;
  onClose: () => void;
  onShared: () => void;
}) {
  const [caption, setCaption] = useState("");
  const [picked, setPicked] = useState<Set<string>>(() => {
    // pre-select up to first 5 photos by default
    const set = new Set<string>();
    for (const p of existingPhotos.slice(0, 5)) set.add(p.url);
    return set;
  });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [locOptions, setLocOptions] = useState<LocationOption[]>([]);
  const [locsLoaded, setLocsLoaded] = useState(false);
  const [pickedLocs, setPickedLocs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loadLocations || locsLoaded) return;
    let cancelled = false;
    loadLocations().then((list) => {
      if (cancelled) return;
      setLocOptions(list);
      setLocsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [loadLocations, locsLoaded]);

  const toggle = (url: string) => {
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(url)) next.delete(url);
      else if (next.size < 10) next.add(url);
      return next;
    });
  };

  const toggleLoc = (id: string) => {
    setPickedLocs((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else if (next.size < 25) next.add(id);
      return next;
    });
  };

  const submit = () => {
    setError(null);
    const photoUrls = Array.from(picked);
    const locationIds = Array.from(pickedLocs);
    startTransition(async () => {
      const r = await createPost({
        refType,
        refId,
        caption: caption.trim() || null,
        photoUrls,
        locationIds: locationIds.length > 0 ? locationIds : undefined,
      });
      if (!r.ok) {
        setError(r.error ?? "paylaşılmadı");
        return;
      }
      onShared();
    });
  };

  return (
    <SimpleDialog open onClose={onClose} title="akışta paylaş">
      <div className="flex flex-col gap-4">
        {existingPhotos.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="label" style={{ fontSize: "0.62rem" }}>
              fotolar ({picked.size}/10)
            </span>
            <div className="grid grid-cols-3 gap-2">
              {existingPhotos.slice(0, 24).map((p, i) => {
                const on = picked.has(p.url);
                return (
                  <button
                    key={p.id ?? `${i}-${p.url}`}
                    type="button"
                    onClick={() => toggle(p.url)}
                    className="relative aspect-square overflow-hidden p-0"
                    style={{
                      borderRadius: 12,
                      border: `2px solid ${on ? "var(--accent)" : "var(--ink)"}`,
                      boxShadow: on ? "var(--shadow-pop-sm)" : "none",
                      opacity: on ? 1 : 0.55,
                    }}
                    aria-pressed={on}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {on && (
                      <span
                        className="absolute top-1 right-1 flex items-center justify-center font-bold"
                        style={{
                          width: 22,
                          height: 22,
                          background: "var(--accent)",
                          border: "1.5px solid var(--ink)",
                          borderRadius: 999,
                          color: "var(--ink)",
                          fontSize: "0.72rem",
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
        )}

        {loadLocations && locOptions.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="label" style={{ fontSize: "0.62rem" }}>
              mekan listesi ({pickedLocs.size}/25) — opsiyonel
            </span>
            <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
              {locOptions.map((l) => {
                const cat = CATEGORIES.find((c) => c.key === l.category);
                const on = pickedLocs.has(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => toggleLoc(l.id)}
                    className="flex items-center gap-2 px-2.5 py-2 text-left"
                    style={{
                      background: on ? "var(--accent-2-soft)" : "var(--surface)",
                      border: `2px solid ${on ? "var(--accent)" : "var(--ink)"}`,
                      borderRadius: "12px",
                    }}
                  >
                    <span style={{ fontSize: "1rem" }}>
                      {cat?.emoji ?? "📍"}
                    </span>
                    <span
                      className="flex-1 text-[0.92rem] font-semibold truncate"
                      style={{ color: "var(--ink)" }}
                    >
                      {l.name}
                    </span>
                    {l.rating != null && l.rating > 0 && (
                      <span
                        className="flex items-center gap-0.5 text-[0.78rem] font-bold"
                        style={{ color: "var(--ink)" }}
                      >
                        <Star
                          size={11}
                          fill="var(--accent-3)"
                          strokeWidth={2}
                        />
                        {l.rating.toFixed(1)}
                      </span>
                    )}
                    {on && (
                      <span
                        className="flex items-center justify-center font-bold"
                        style={{
                          width: 20,
                          height: 20,
                          background: "var(--accent)",
                          border: "1.5px solid var(--ink)",
                          borderRadius: 999,
                          color: "var(--ink)",
                          fontSize: "0.7rem",
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
        )}

        <label className="flex flex-col gap-1.5">
          <span className="label" style={{ fontSize: "0.62rem" }}>
            açıklama (opsiyonel, max 500)
          </span>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="ne paylaşmak istiyorsun?"
            className="field-textarea"
          />
        </label>

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
          disabled={pending}
          className="btn-primary w-full justify-center"
          style={{ padding: "0.95rem 1.25rem" }}
        >
          <Send size={16} strokeWidth={2.5} />
          {pending ? "paylaşılıyor…" : "paylaş"}
        </button>
      </div>
    </SimpleDialog>
  );
}
