"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, Check, X } from "lucide-react";
import { SimpleDialog } from "./simple-dialog";
import { COUNTRY_BY_NUMERIC, isoToFlag } from "@/lib/country-codes";
import {
  toggleVisitedCountry,
  updateCountryNote,
  addCountryPhoto,
  removeCountryPhoto,
} from "@/app/actions/countries";
import type { VisitedCountry, CountryPhoto } from "@/lib/types";

type SelectedData = {
  code: string;
  visited: VisitedCountry | null;
  photos: CountryPhoto[];
};

function countryName(code: string): string {
  for (const entry of Object.values(COUNTRY_BY_NUMERIC)) {
    if (entry.iso2 === code) return entry.name;
  }
  return code;
}

export function CountrySheet({
  data,
  open,
  onClose,
}: {
  data: SelectedData | null;
  open: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>("");
  const [noteSaved, setNoteSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (data?.visited?.note !== undefined) {
      setNoteDraft(data.visited?.note ?? "");
    } else {
      setNoteDraft("");
    }
    setUploadErr(null);
    setNoteSaved(false);
  }, [data?.code, data?.visited?.note]);

  if (!data) {
    return (
      <SimpleDialog open={open} onClose={onClose} title="">
        <div />
      </SimpleDialog>
    );
  }

  const { code, visited, photos } = data;
  const isVisited = visited !== null;
  const name = countryName(code);
  const flag = isoToFlag(code);

  const onToggle = () => {
    if (isVisited) {
      if (photos.length > 0) {
        if (!confirm("tüm fotolar da gider. silsin mi?")) return;
      }
    }
    startTransition(async () => {
      await toggleVisitedCountry(code);
    });
  };

  const onNoteBlur = () => {
    const clean = noteDraft.trim();
    const current = visited?.note ?? "";
    if (clean === current) return;
    startTransition(async () => {
      if (!isVisited) {
        await toggleVisitedCountry(code);
      }
      await updateCountryNote(code, clean.length > 0 ? clean : null);
      setNoteSaved(true);
      if (noteTimer.current) clearTimeout(noteTimer.current);
      noteTimer.current = setTimeout(() => setNoteSaved(false), 1200);
    });
  };

  const onUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadErr(null);
    startTransition(async () => {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.set("code", code);
        fd.set("file", file);
        const r = await addCountryPhoto(fd);
        if (!r.ok) {
          setUploadErr(r.error ?? "yüklenmedi aq");
          break;
        }
      }
    });
  };

  const onRemovePhoto = (id: string) => {
    if (!confirm("foto sikilsin mi?")) return;
    startTransition(() => {
      removeCountryPhoto(id);
    });
  };

  return (
    <SimpleDialog open={open} onClose={onClose} title="">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3 -mt-1">
          <span className="text-[2.2rem] leading-none">{flag}</span>
          <div className="flex-1 min-w-0">
            <h2 className="text-[1.25rem] font-semibold tracking-tight leading-tight truncate">
              {name}
            </h2>
            <span
              className="label"
              style={{ fontSize: "0.62rem", color: "var(--text-dim)" }}
            >
              {code}
            </span>
          </div>
          {isVisited && (
            <span className="pill pill-mint anim-pop">
              <Check size={12} strokeWidth={2.5} />
              gittik
            </span>
          )}
        </div>

        <button
          onClick={onToggle}
          disabled={pending}
          className={isVisited ? "btn-ghost" : "btn-primary"}
          style={{ width: "100%", padding: "0.9rem 1.25rem", fontSize: "1rem" }}
        >
          {pending
            ? "bir dakika aq…"
            : isVisited
            ? "yok burayı görmedik"
            : "burayı gördük"}
        </button>

        <label className="flex flex-col gap-1.5">
          <span
            className="label"
            style={{ fontSize: "0.62rem" }}
          >
            not {noteSaved && <span style={{ color: "var(--accent)" }}>✓</span>}
          </span>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={onNoteBlur}
            rows={2}
            placeholder={
              isVisited
                ? "nasıldı aq?"
                : "tık önce 'burayı gördük'e bas…"
            }
            disabled={!isVisited && pending}
            className="field-textarea"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="label" style={{ fontSize: "0.62rem" }}>
            fotolar
          </span>
          {photos.length === 0 && (
            <p
              className="text-[0.8rem]"
              style={{ color: "var(--text-dim)" }}
            >
              daha foto yok. aşağıdan at.
            </p>
          )}
          {photos.length > 0 && (
            <div className="flex gap-2.5 overflow-x-auto -mx-5 px-5 pb-2 pt-1">
              {photos.map((p) => (
                <div key={p.id} className="relative flex-shrink-0">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden"
                    style={{
                      borderRadius: "14px",
                      border: "2px solid var(--ink)",
                      boxShadow: "var(--shadow-pop-sm)",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-24 h-24 object-cover"
                    />
                  </a>
                  <button
                    onClick={() => onRemovePhoto(p.id)}
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
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="btn-ghost disabled:opacity-50"
            style={{ width: "100%" }}
          >
            <Camera size={16} strokeWidth={2} />
            foto at
          </button>
          {uploadErr && (
            <p
              className="text-[0.75rem] mt-0.5"
              style={{ color: "var(--danger)" }}
            >
              {uploadErr}
            </p>
          )}
          {pending && (
            <p
              className="text-[0.75rem] mt-0.5"
              style={{ color: "var(--text-dim)" }}
            >
              yükleniyor…
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onUpload(e.target.files)}
          />
        </div>
      </div>
    </SimpleDialog>
  );
}
