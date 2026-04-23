"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Plus, Camera, X } from "lucide-react";
import { useJsApiLoader } from "@react-google-maps/api";
import { SimpleDialog } from "./simple-dialog";
import { createTrip } from "@/app/actions/trips";

const LIBRARIES: ("places")[] = ["places"];

export function CreateTripButton() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(
    null
  );
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
    if (center) {
      fd.set("center_lat", String(center.lat));
      fd.set("center_lng", String(center.lng));
    }
    startTransition(() => createTrip(fd));
  };

  const onCloseDialog = () => {
    setOpen(false);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(null);
    setCoverPreview(null);
    setCenter(null);
  };

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
        yeni tatil
      </button>

      <SimpleDialog
        open={open}
        onClose={onCloseDialog}
        title="yeni plan aç"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <CoverUpload
            preview={coverPreview}
            inputRef={coverInputRef}
            onPick={onCoverPick}
          />
          <Field label="nereye">
            <DestinationInput
              onPick={(lat, lng) => setCenter({ lat, lng })}
              onClear={() => setCenter(null)}
            />
          </Field>
          <Field label="açıklama">
            <textarea
              name="description"
              rows={2}
              placeholder="birkaç not düş, neye gidiyoruz lan?"
              className="field-textarea"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="başlangıç">
              <input type="date" name="start_date" className="field-input" />
            </Field>
            <Field label="bitiş">
              <input type="date" name="end_date" className="field-input" />
            </Field>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="btn-primary w-full mt-2"
            style={{ padding: "0.95rem 1.25rem" }}
          >
            {pending ? "açıyor aq…" : "aç gitsin"}
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
      <span className="label" style={{ fontSize: "0.62rem" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

export function DestinationInput({
  onPick,
  onClear,
  defaultValue,
  name = "name",
}: {
  onPick: (lat: number, lng: number) => void;
  onClear: () => void;
  defaultValue?: string;
  name?: string;
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: LIBRARIES,
    language: "tr",
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef(onPick);
  const clearRef = useRef(onClear);

  useEffect(() => {
    pickRef.current = onPick;
  }, [onPick]);
  useEffect(() => {
    clearRef.current = onClear;
  }, [onClear]);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;
    const ac = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ["name", "formatted_address", "geometry"],
      types: ["(cities)"],
    });
    const listener = ac.addListener("place_changed", () => {
      const p = ac.getPlace();
      if (!p.geometry?.location) return;
      pickRef.current(p.geometry.location.lat(), p.geometry.location.lng());
    });
    return () => {
      listener.remove();
      google.maps.event.clearInstanceListeners(ac);
    };
  }, [isLoaded]);

  if (loadError) {
    return (
      <input
        name={name}
        required
        defaultValue={defaultValue}
        placeholder="Roma 2026"
        className="field-input"
      />
    );
  }

  return (
    <input
      ref={inputRef}
      name={name}
      required
      defaultValue={defaultValue}
      disabled={!isLoaded}
      placeholder={isLoaded ? "nereye gidiyoruz? (Sevilla, Roma…)" : "yükleniyor…"}
      onChange={() => clearRef.current()}
      className="field-input"
    />
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
      {preview ? (
        <div
          className="relative aspect-[4/5] w-full overflow-hidden group"
          style={{
            borderRadius: "14px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt=""
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-3 left-3 px-3 py-1.5 text-[0.75rem] font-medium"
            style={{
              background: "color-mix(in srgb, var(--bg) 85%, transparent)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              borderRadius: "999px",
              color: "var(--text)",
            }}
          >
farklısı gelsin
          </button>
          <button
            type="button"
            onClick={() => onPick(null)}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center"
            style={{
              background: "color-mix(in srgb, var(--text) 70%, transparent)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              borderRadius: "999px",
              color: "var(--bg)",
            }}
            aria-label="uçur"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full aspect-[4/5] flex flex-col items-center justify-center gap-2 transition-colors"
          style={{
            border: "1px solid var(--line)",
            background: "var(--surface)",
            borderRadius: "14px",
            color: "var(--text-muted)",
          }}
        >
          <Camera size={20} strokeWidth={1.5} />
          <span className="text-[0.85rem] font-medium">kapak at</span>
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
