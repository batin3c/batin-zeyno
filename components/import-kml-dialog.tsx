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
        className="btn-chip"
        title="KML dosyası içe aktar"
      >
        <FileArchive size={11} strokeWidth={1.75} />
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
        <p
          className="text-[0.9rem] leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          google takeout → maps → saved places (kml) dosyasını yükle. her pin
          bu tatile otomatik eklenecek.
        </p>

        <button
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 p-8 transition-all"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "14px",
            color: "var(--text-muted)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--line)";
          }}
        >
          <Upload size={20} strokeWidth={1.5} />
          <div className="flex flex-col items-center gap-0.5">
            <span
              className="text-[0.95rem] font-medium tracking-tight"
              style={{ color: "var(--text)" }}
            >
              {file ? file.name : "dosyayı seç"}
            </span>
            {file && (
              <span className="text-[0.75rem]">
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
            className="p-3 text-[0.9rem]"
            style={{
              background: result.ok ? "var(--accent-soft)" : "color-mix(in srgb, var(--danger) 12%, transparent)",
              color: result.ok ? "var(--accent)" : "var(--danger)",
              borderRadius: "10px",
            }}
          >
            {result.ok
              ? `${result.count} yer eklendi`
              : result.error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={!file || pending}
          className="btn-primary w-full"
          style={{ padding: "0.95rem 1.25rem" }}
        >
          {pending ? "içe aktarılıyor…" : "içe aktar"}
        </button>
      </div>
    </SimpleDialog>
  );
}
