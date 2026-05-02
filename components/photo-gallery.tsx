"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Check, Trash2, X } from "lucide-react";
import { PhotoLightbox } from "./photo-lightbox";
import { usePhotoUpload } from "@/hooks/use-photo-upload";

export type GalleryItem = {
  /** stable id (for user-uploaded photos) — optional for Google photos */
  id?: string;
  url: string;
  /** when true, item is undeletable (e.g. Google photo) */
  isExternal?: boolean;
};

export function PhotoGallery({
  items,
  onUpload,
  onRemove,
  onRemoveBulk,
  emptyHint = "daha foto yok. aşağıdan at.",
  uploadLabel = "foto at",
  variant = "list",
}: {
  items: GalleryItem[];
  onUpload: (file: File) => Promise<{ ok: boolean; error?: string }>;
  /** single delete (used in single-confirm flows) */
  onRemove?: (id: string) => Promise<{ ok: boolean; error?: string }>;
  /** bulk delete — fired after user confirms in multi-select mode */
  onRemoveBulk?: (ids: string[]) => Promise<{ ok: boolean; error?: string }>;
  emptyHint?: string;
  uploadLabel?: string;
  /** 'list' = location-list compact, 'sheet' = used inside SimpleDialog */
  variant?: "list" | "sheet";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const { state, start } = usePhotoUpload({ upload: onUpload });

  // exit select mode when item set changes (e.g. after delete)
  useEffect(() => {
    if (selectMode && items.length === 0) setSelectMode(false);
    setSelected((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (items.some((i) => i.id === id)) next.add(id);
      }
      return next;
    });
  }, [items, selectMode]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onLongPress = (id: string) => {
    if (!selectMode) {
      setSelectMode(true);
      setSelected(new Set([id]));
    }
  };

  const onItemClick = (id: string | undefined, idx: number) => {
    if (selectMode) {
      if (id) toggleSelect(id);
      return;
    }
    setLightboxIdx(idx);
  };

  const onBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`${selected.size} foto sikilsin mi?`)) return;
    setBulkBusy(true);
    try {
      if (onRemoveBulk) {
        await onRemoveBulk(Array.from(selected));
      } else if (onRemove) {
        for (const id of selected) {
          await onRemove(id);
        }
      }
      setSelected(new Set());
      setSelectMode(false);
    } finally {
      setBulkBusy(false);
    }
  };

  const onSingleRemove = async (id: string) => {
    if (!confirm("foto sikilsin mi?")) return;
    if (onRemove) await onRemove(id);
  };

  const hasItems = items.length > 0;
  const containerOffset = variant === "sheet" ? "-mx-5 px-5" : "-mx-4 px-4";

  return (
    <div className="flex flex-col gap-2">
      {selectMode && (
        <div className="flex items-center justify-between">
          <span
            className="text-[0.85rem] font-semibold"
            style={{ color: "var(--ink)" }}
          >
            {selected.size} seçili
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectMode(false);
                setSelected(new Set());
              }}
              className="btn-chip"
              style={{ background: "var(--surface-2)" }}
            >
              vazgeç
            </button>
            <button
              type="button"
              onClick={onBulkDelete}
              disabled={selected.size === 0 || bulkBusy}
              className="btn-chip disabled:opacity-50"
              style={{
                background: "var(--danger-soft)",
                color: "var(--ink)",
                fontWeight: 600,
              }}
            >
              <Trash2 size={12} strokeWidth={2.5} />
              sil
            </button>
          </div>
        </div>
      )}

      {!hasItems && !state.pending && (
        <p className="text-[0.8rem]" style={{ color: "var(--text-dim)" }}>
          {emptyHint}
        </p>
      )}

      {hasItems && (
        <div
          className={`flex gap-2.5 overflow-x-auto pb-2 pt-1 ${containerOffset}`}
        >
          {items.map((it, i) => {
            const id = it.id;
            const isSelected = id ? selected.has(id) : false;
            return (
              <div key={id ?? it.url} data-photo-card className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onItemClick(id, i)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (id) onLongPress(id);
                  }}
                  onTouchStart={(e) => {
                    if (!id) return;
                    const target = e.currentTarget;
                    const t = setTimeout(() => onLongPress(id), 450);
                    const cancel = () => {
                      clearTimeout(t);
                      target.removeEventListener("touchend", cancel);
                      target.removeEventListener("touchmove", cancel);
                      target.removeEventListener("touchcancel", cancel);
                    };
                    target.addEventListener("touchend", cancel);
                    target.addEventListener("touchmove", cancel);
                    target.addEventListener("touchcancel", cancel);
                  }}
                  className="block overflow-hidden p-0 relative w-24 h-24"
                  style={{
                    borderRadius: "14px",
                    border: `2px solid ${isSelected ? "var(--accent)" : "var(--ink)"}`,
                    boxShadow: "var(--shadow-pop-sm)",
                    transform: isSelected ? "scale(0.94)" : undefined,
                    transition: "transform 140ms",
                  }}
                >
                  {it.isExternal ? (
                    // Google JS SDK URLs are session-bound and expire — we render
                    // them with plain <img> (next/image would need remotePatterns)
                    // and hide the broken-placeholder return (Google's 100x100 png).
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.url}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                      onLoad={(e) => {
                        const el = e.currentTarget;
                        if (el.naturalWidth <= 120 && el.naturalHeight <= 120) {
                          const card = el.closest('[data-photo-card]') as HTMLElement | null;
                          if (card) card.style.display = 'none';
                        }
                      }}
                      onError={(e) => {
                        const card = (e.currentTarget.closest('[data-photo-card]') as HTMLElement | null);
                        if (card) card.style.display = 'none';
                      }}
                    />
                  ) : (
                    <Image
                      src={it.url}
                      alt=""
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  )}
                </button>

                {it.isExternal && (
                  <span
                    className="absolute top-1.5 left-1.5 flex items-center justify-center text-[0.62rem] font-bold pointer-events-none"
                    style={{
                      width: "22px",
                      height: "22px",
                      background: "var(--accent-3-soft)",
                      border: "1.5px solid var(--ink)",
                      borderRadius: "999px",
                      color: "var(--ink)",
                    }}
                    title="Google fotoğrafı"
                  >
                    G
                  </span>
                )}

                {selectMode && id && isSelected && (
                  <span
                    className="absolute -top-2 -right-2 flex items-center justify-center pointer-events-none anim-pop"
                    style={{
                      width: "26px",
                      height: "26px",
                      background: "var(--accent)",
                      border: "2px solid var(--ink)",
                      borderRadius: "999px",
                      color: "var(--ink)",
                    }}
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}

                {!selectMode && id && !it.isExternal && onRemove && (
                  <button
                    onClick={() => onSingleRemove(id)}
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
                )}
              </div>
            );
          })}
        </div>
      )}

      {!selectMode && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={state.pending}
          className="btn-ghost disabled:opacity-50"
          style={{ width: "100%" }}
        >
          <Camera size={16} strokeWidth={2} />
          {uploadLabel}
        </button>
      )}

      {state.pending && (
        <p className="text-[0.75rem]" style={{ color: "var(--text-dim)" }}>
          {state.done}/{state.total} yükleniyor…
        </p>
      )}
      {state.error && (
        <p className="text-[0.75rem]" style={{ color: "var(--danger)" }}>
          {state.error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          start(e.target.files);
          e.target.value = "";
        }}
      />

      <PhotoLightbox
        urls={items.map((i) => i.url)}
        index={lightboxIdx}
        onClose={() => setLightboxIdx(null)}
      />
    </div>
  );
}
