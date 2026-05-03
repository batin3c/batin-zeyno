"use client";

import { useState, useTransition } from "react";
import { Send, Heart } from "lucide-react";
import { SimpleDialog } from "./simple-dialog";
import { createPost } from "@/app/actions/posts";
import type { PostRefType } from "@/lib/types";

type PhotoOption = { url: string; id?: string };

export function SharePostButton({
  refType,
  refId,
  existingPhotos = [],
  label = "akışta paylaş",
  buttonClassName = "btn-primary",
  buttonStyle,
  onShared,
}: {
  refType: PostRefType;
  refId: string;
  existingPhotos?: PhotoOption[];
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
  onClose,
  onShared,
}: {
  refType: PostRefType;
  refId: string;
  existingPhotos: PhotoOption[];
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

  const toggle = (url: string) => {
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(url)) next.delete(url);
      else if (next.size < 10) next.add(url);
      return next;
    });
  };

  const submit = () => {
    setError(null);
    const photoUrls = Array.from(picked);
    startTransition(async () => {
      const r = await createPost({
        refType,
        refId,
        caption: caption.trim() || null,
        photoUrls,
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
