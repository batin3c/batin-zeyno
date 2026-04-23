"use client";

import { useState, useRef, useTransition } from "react";
import { Upload, FileArchive } from "lucide-react";
import { SimpleDialog } from "./simple-dialog";
import { importKml } from "@/app/actions/import";

export function ImportKmlButton({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="j-btn-ghost"
        style={{ padding: "0.45rem 0.75rem", fontSize: "0.62rem" }}
        title="KML dosyası içe aktar"
      >
        <FileArchive size={11} strokeWidth={1.8} />
        kml
      </button>
      {open && <ImportKmlDialog tripId={tripId} onClose={() => setOpen(false)} />}
    </>
  );
}

function ImportKmlDialog({
  tripId,
  onClose,
}: {
  tripId: string;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    ok: boolean;
    count: number;
    error?: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!file) return;
    const fd = new FormData();
    fd.set("trip_id", tripId);
    fd.set("file", file);
    startTransition(async () => {
      const r = await importKml(fd);
      setResult(r);
      if (r.ok) {
        setTimeout(onClose, 1500);
      }
    });
  };

  return (
    <SimpleDialog open={true} onClose={onClose} title="kml içe aktar">
      <div className="flex flex-col gap-5">
        <p className="font-serif italic text-sm text-[color:var(--ink-soft)] leading-relaxed">
          google takeout → maps → saved places (kml) dosyasını yükle. her pin
          bu tatile otomatik eklenecek.
        </p>

        <button
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 p-8 transition hover:bg-[color:var(--paper-soft)]"
          style={{
            border: "1px dashed var(--faded)",
            background:
              "color-mix(in srgb, var(--paper-soft) 50%, transparent)",
          }}
        >
          <Upload
            size={22}
            strokeWidth={1.5}
            style={{ color: "var(--ink-soft)" }}
          />
          <div className="flex flex-col items-center gap-1">
            <span className="font-serif italic text-base text-[color:var(--ink)]">
              {file ? file.name : "dosyayı seç"}
            </span>
            {file && (
              <span className="label-mono">
                {(file.size / 1024).toFixed(0)} kb
              </span>
            )}
          </div>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".kml,application/vnd.google-earth.kml+xml"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setResult(null);
          }}
        />

        {result && (
          <div
            className="p-3 font-serif italic text-sm"
            style={{
              background: result.ok
                ? "color-mix(in srgb, var(--sea) 12%, transparent)"
                : "color-mix(in srgb, var(--stamp) 12%, transparent)",
              border: `1px dashed ${result.ok ? "var(--sea)" : "var(--stamp)"}`,
              color: result.ok ? "var(--sea)" : "var(--stamp)",
            }}
          >
            {result.ok
              ? `✓ ${result.count} yer eklendi`
              : `✕ ${result.error}`}
          </div>
        )}

        <button
          onClick={submit}
          disabled={!file || pending}
          className="j-btn-stamp w-full"
          style={{ padding: "0.9rem 1.25rem" }}
        >
          {pending ? "içe aktarılıyor…" : "içe aktar"}
        </button>
      </div>
    </SimpleDialog>
  );
}
