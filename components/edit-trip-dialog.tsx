"use client";

import { useState, useTransition, useRef } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { SimpleDialog } from "./simple-dialog";
import { CoverUpload } from "./create-trip-dialog";
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

    startTransition(async () => {
      await updateTrip(fd);
      if (coverCleared && !coverFile && trip.cover_url) {
        await removeTripCover(trip.id);
      }
      setOpen(false);
    });
  };

  const onDelete = () => {
    if (!confirm(`"${trip.name}" silinsin mi? Tüm yerler de gider.`)) return;
    const fd = new FormData();
    fd.set("id", trip.id);
    startTransition(() => deleteTrip(fd));
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 text-[color:var(--ink-soft)] hover:text-[color:var(--ink)] transition-colors"
        aria-label="Düzenle"
        title="Düzenle"
      >
        <Pencil size={16} strokeWidth={1.5} />
      </button>

      <SimpleDialog
        open={open}
        onClose={() => setOpen(false)}
        title="tatili düzenle"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <CoverUpload
            preview={coverPreview}
            inputRef={coverInputRef}
            onPick={onCoverPick}
          />
          <label className="flex flex-col gap-1.5">
            <span className="label-mono">isim</span>
            <input
              name="name"
              required
              defaultValue={trip.name}
              className="j-input"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-mono">açıklama (opsiyonel)</span>
            <textarea
              name="description"
              rows={2}
              defaultValue={trip.description ?? ""}
              className="j-textarea"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="label-mono">başlangıç</span>
              <input
                type="date"
                name="start_date"
                defaultValue={trip.start_date ?? ""}
                className="j-input"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="label-mono">bitiş</span>
              <input
                type="date"
                name="end_date"
                defaultValue={trip.end_date ?? ""}
                className="j-input"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="j-btn-stamp mt-2 w-full"
            style={{ padding: "0.9rem 1.25rem" }}
          >
            {pending ? "kaydediliyor…" : "kaydet"}
          </button>
          <div className="dashed-rule my-2" />
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="flex items-center justify-center gap-2 py-2 label-mono hover:text-[color:var(--stamp)] transition-colors disabled:opacity-40"
            style={{ color: "var(--ink-soft)" }}
          >
            <Trash2 size={12} strokeWidth={1.5} />
            tatili sil
          </button>
        </form>
      </SimpleDialog>
    </>
  );
}
