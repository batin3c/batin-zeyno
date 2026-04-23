"use client";

import { useState, useRef, useTransition } from "react";
import { Camera, KeyRound } from "lucide-react";
import { SimpleDialog } from "./simple-dialog";
import { PuzzleSetter } from "./puzzle-setter";
import {
  updateMemberName,
  updateMemberAvatar,
} from "@/app/actions/settings";
import type { Member } from "@/lib/types";

export function SettingsClient({
  members,
  currentPatternLength,
}: {
  members: Member[];
  currentPatternLength: number;
}) {
  return (
    <div className="flex flex-col gap-10 pt-4">
      <section>
        <h2 className="section-title mb-5">biz</h2>
        <div className="flex flex-col gap-5">
          {members.map((m, i) => (
            <MemberRow key={m.id} member={m} index={i} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title mb-5">mühür</h2>
        <PuzzleSection currentLength={currentPatternLength} />
      </section>

      <section>
        <h2 className="section-title mb-5">notlar</h2>
        <div className="space-y-2 font-serif italic text-[color:var(--ink-soft)]">
          <p>· isim değişiklikleri anında kaydolur, kutudan çıkınca yeter.</p>
          <p>· yeni fotoğraf yüklersen eski fotoğraf otomatik silinir.</p>
          <p>· mührü değiştirirsen 30 günlük oturumlar korunur.</p>
        </div>
      </section>
    </div>
  );
}

function MemberRow({ member, index }: { member: Member; index: number }) {
  const [name, setName] = useState(member.name);
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const saveName = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === member.name) return;
    const fd = new FormData();
    fd.set("id", member.id);
    fd.set("name", trimmed);
    startTransition(() => updateMemberName(fd));
  };

  const uploadAvatar = async (file: File) => {
    setUploadErr(null);
    setUploading(true);
    const fd = new FormData();
    fd.set("id", member.id);
    fd.set("file", file);
    const r = await updateMemberAvatar(fd);
    setUploading(false);
    if (!r.ok) setUploadErr(r.error ?? "yükleme hatası");
  };

  const tilt = index % 2 === 0 ? -1.5 : 1.5;

  return (
    <div className="flex items-center gap-5 py-2">
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="relative w-20 h-24 overflow-hidden flex items-center justify-center text-xl font-serif italic shrink-0 group transition-transform duration-300 hover:rotate-0"
        style={{
          background: "color-mix(in srgb, var(--paper) 98%, #fff)",
          padding: "5px 5px 15px",
          color: "var(--ink)",
          transform: `rotate(${tilt}deg)`,
          boxShadow: `
            0 1px 0 rgba(28,24,20,0.04),
            0 4px 12px rgba(28,24,20,0.12)
          `,
        }}
        aria-label="Fotoğraf değiştir"
      >
        <div
          className="w-full h-full overflow-hidden"
          style={{ background: "var(--paper-soft)" }}
        >
          {member.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.avatar_url}
              alt={member.name}
              className="w-full h-full object-cover"
              style={{ filter: "sepia(0.08) saturate(0.9)" }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span>{member.name.slice(0, 1).toUpperCase()}</span>
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition opacity-0 group-hover:opacity-100">
          <Camera size={16} strokeWidth={1.5} className="text-white" />
        </div>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadAvatar(f);
        }}
      />
      <div className="flex-1 flex flex-col gap-2">
        <span className="label-mono">isim</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="j-input"
          style={{ fontFamily: "var(--font-fraunces), serif", fontStyle: "italic", fontSize: "1.15rem" }}
        />
      </div>
      {uploading && (
        <span className="label-mono opacity-60">yükleniyor…</span>
      )}
      {uploadErr && (
        <span className="label-mono" style={{ color: "var(--stamp)" }}>
          {uploadErr}
        </span>
      )}
    </div>
  );
}

function PuzzleSection({ currentLength }: { currentLength: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="stamp-frame flex items-center justify-between p-5"
      style={{ transform: "rotate(-0.3deg)" }}
    >
      <div>
        <div className="font-serif italic text-lg text-[color:var(--ink)]">
          9-nokta desen
        </div>
        <div className="label-mono mt-1">
          {currentLength} nokta · aktif
        </div>
      </div>
      <button
        onClick={() => setOpen(true)}
        className="j-btn-stamp"
        style={{ padding: "0.6rem 0.95rem", fontSize: "0.68rem" }}
      >
        <KeyRound size={12} strokeWidth={1.8} />
        değiştir
      </button>
      {open && (
        <SimpleDialog
          open={true}
          onClose={() => setOpen(false)}
          title="mührü değiştir"
        >
          <PuzzleSetter onDone={() => setOpen(false)} />
        </SimpleDialog>
      )}
    </div>
  );
}
