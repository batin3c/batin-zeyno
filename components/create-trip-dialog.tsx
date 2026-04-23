"use client";

import { useState, useTransition, useRef } from "react";
import { Plus, Camera, X } from "lucide-react";
import { SimpleDialog } from "./simple-dialog";
import { createTrip } from "@/app/actions/trips";

export function CreateTripButton() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const onCoverPick = (file: File | null) => {
    setCoverFile(file);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (coverFile) fd.set("cover_file", coverFile);
    startTransition(() => createTrip(fd));
  };

  const onCloseDialog = () => {
    setOpen(false);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(null);
    setCoverPreview(null);
  };

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
        yeni tatil
      </button>

      <SimpleDialog
        open={open}
        onClose={onCloseDialog}
        title="yeni tatil planı"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <CoverUpload
            preview={coverPreview}
            inputRef={coverInputRef}
            onPick={onCoverPick}
          />
          <Field label="isim">
            <input
              name="name"
              required
              autoFocus
              placeholder="Roma 2026"
              className="j-input"
            />
          </Field>
          <Field label="açıklama (opsiyonel)">
            <textarea
              name="description"
              rows={2}
              placeholder="birkaç not…"
              className="j-textarea"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="başlangıç">
              <input type="date" name="start_date" className="j-input" />
            </Field>
            <Field label="bitiş">
              <input type="date" name="end_date" className="j-input" />
            </Field>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="j-btn-stamp mt-2 w-full"
            style={{ padding: "0.9rem 1.25rem" }}
          >
            {pending ? "oluşturuluyor…" : "oluştur"}
          </button>
        </form>
      </SimpleDialog>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-mono">{label}</span>
      {children}
    </label>
  );
}

export function CoverUpload({
  preview,
  inputRef,
  onPick,
}: {
  preview: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (file: File | null) => void;
}) {
  return (
    <div>
      <div className="label-mono mb-2">kapak · polaroid</div>
      {preview ? (
        <div
          className="relative aspect-[5/3] w-full overflow-hidden group"
          style={{ border: "1px solid var(--faded)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: "saturate(0.92) contrast(1.02)" }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="j-btn-ghost"
              style={{
                background: "var(--paper)",
                fontSize: "0.62rem",
                padding: "0.4rem 0.7rem",
              }}
            >
              değiştir
            </button>
            <button
              type="button"
              onClick={() => onPick(null)}
              className="j-btn-ghost"
              style={{
                background: "var(--paper)",
                color: "var(--stamp)",
                borderColor: "var(--stamp)",
                fontSize: "0.62rem",
                padding: "0.4rem 0.7rem",
              }}
            >
              <X size={11} strokeWidth={1.8} /> kaldır
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full aspect-[5/3] flex flex-col items-center justify-center gap-2 transition-colors hover:bg-[color:var(--paper-soft)]"
          style={{
            border: "1px dashed var(--faded)",
          }}
        >
          <Camera
            size={22}
            strokeWidth={1.5}
            style={{ color: "var(--ink-soft)" }}
          />
          <span className="label-mono">kapak ekle</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
