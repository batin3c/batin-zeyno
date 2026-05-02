"use client";

import { useState, useTransition, useRef } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { SimpleDialog } from "./simple-dialog";
import { CoverUpload, DestinationInput } from "./create-trip-dialog";
import { updateTrip, removeTripCover, deleteTrip } from "@/app/actions/trips";
import type { Trip } from "@/lib/types";

export function EditTripButton({ trip }: { trip: Trip }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(
    trip.cover_url
  );
  const [coverCleared, setCoverCleared] = useState(false);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const coverInputRef = useRef<HTMLInputElement>(null);

  const onCoverPick = (file: File | null) => {
    setCoverFile(file);
    if (coverPreview && coverPreview.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreview);
    }
    if (file) {
      setCoverPreview(URL.createObjectURL(file));
      setCoverCleared(false);
    } else {
      setCoverPreview(null);
      setCoverCleared(true);
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("id", trip.id);
    if (coverFile) fd.set("cover_file", coverFile);
    if (center) {
      fd.set("center_lat", String(center.lat));
      fd.set("center_lng", String(center.lng));
    }

    startTransition(async () => {
      await updateTrip(fd);
      if (coverCleared && !coverFile && trip.cover_url) {
        await removeTripCover(trip.id);
      }
      setOpen(false);
    });
  };

  const onDelete = () => {
    if (!confirm(`"${trip.name}" silinsin mi? tüm yerler de gider.`)) return;
    const fd = new FormData();
    fd.set("id", trip.id);
    startTransition(() => deleteTrip(fd));
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-icon"
        aria-label="Düzenle"
        title="Düzenle"
      >
        <Pencil size={16} strokeWidth={1.75} />
      </button>

      <SimpleDialog
        open={open}
        onClose={() => setOpen(false)}
        title="tatile dokun"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <CoverUpload
            preview={coverPreview}
            inputRef={coverInputRef}
            onPick={onCoverPick}
          />
          <label className="flex flex-col gap-1.5">
            <span className="label" style={{ fontSize: "0.62rem" }}>
              nereye
            </span>
            <DestinationInput
              defaultValue={trip.name}
              onPick={(lat, lng) => setCenter({ lat, lng })}
              onClear={() => setCenter(null)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label" style={{ fontSize: "0.62rem" }}>
              açıklama
            </span>
            <textarea
              name="description"
              rows={2}
              defaultValue={trip.description ?? ""}
              className="field-textarea"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="label" style={{ fontSize: "0.62rem" }}>
                başlangıç
              </span>
              <input
                type="date"
                name="start_date"
                defaultValue={trip.start_date ?? ""}
                className="field-input"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="label" style={{ fontSize: "0.62rem" }}>
                bitiş
              </span>
              <input
                type="date"
                name="end_date"
                defaultValue={trip.end_date ?? ""}
                className="field-input"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="btn-primary w-full mt-2"
            style={{ padding: "0.95rem 1.25rem" }}
          >
            {pending ? "kaydediliyor…" : "kaydet"}
          </button>

          <div
            className="mt-4 p-4 flex flex-col gap-2"
            style={{
              background: "var(--danger-soft)",
              border: "2px solid var(--ink)",
              borderRadius: "16px",
            }}
          >
            <span className="label" style={{ color: "var(--ink)" }}>
              tehlikeli bölge
            </span>
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              className="flex items-center justify-center gap-2 w-full font-bold disabled:opacity-40"
              style={{
                background: "var(--danger)",
                color: "#fff",
                border: "2px solid var(--ink)",
                borderRadius: "12px",
                padding: "0.7rem 1rem",
                fontSize: "0.95rem",
                boxShadow: "var(--shadow-pop-sm)",
              }}
            >
              <Trash2 size={16} strokeWidth={2.5} />
              tatili sil
            </button>
          </div>
        </form>
      </SimpleDialog>
    </>
  );
}
