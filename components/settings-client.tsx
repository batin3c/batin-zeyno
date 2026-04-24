"use client";

import { useState, useRef, useTransition } from "react";
import { Camera, KeyRound } from "lucide-react";
import { SimpleDialog } from "./simple-dialog";
import { PuzzleSetter } from "./puzzle-setter";
import {
  updateMemberName,
  updateMemberAvatar,
} from "@/app/actions/settings";
import { PushToggle } from "./push-toggle";
import type { Member } from "@/lib/types";

export function SettingsClient({
  members,
  currentPatternLength,
}: {
  members: Member[];
  currentPatternLength: number;
}) {
  return (
    <div className="flex flex-col gap-10 pt-6">
      <Section title="biz">
        <div className="flex flex-col">
          {members.map((m, i) => (
            <MemberRow key={m.id} member={m} last={i === members.length - 1} />
          ))}
        </div>
      </Section>

      <Section title="bildirim">
        <PushToggle />
      </Section>

      <Section title="mühür">
        <PuzzleSection currentLength={currentPatternLength} />
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="label mb-3 ml-0.5">{title}</h2>
      <div
        className="overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "2px solid var(--ink)",
          borderRadius: "20px",
          boxShadow: "var(--shadow-pop)",
        }}
      >
        {children}
      </div>
    </section>
  );
}

function MemberRow({ member, last }: { member: Member; last: boolean }) {
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
    if (!r.ok) setUploadErr(r.error ?? "yüklenmedi aq");
  };

  return (
    <div
      className="flex items-center gap-4 p-4"
      style={{
        borderBottom: last ? "none" : "2px solid var(--ink)",
      }}
    >
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="relative w-14 h-14 overflow-hidden flex items-center justify-center text-lg font-bold shrink-0 group transition-transform active:scale-[0.96]"
        style={{
          background: "var(--accent-3-soft)",
          color: "var(--ink)",
          border: "2px solid var(--ink)",
          borderRadius: "14px",
          boxShadow: "var(--shadow-pop-sm)",
        }}
        aria-label="foto değiştir"
      >
        {member.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.avatar_url}
            alt={member.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{member.name.slice(0, 1).toUpperCase()}</span>
        )}
        <div
          className="absolute inset-0 flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100"
          style={{
            background: "color-mix(in srgb, var(--text) 40%, transparent)",
          }}
        >
          <Camera size={16} strokeWidth={1.75} style={{ color: "var(--bg)" }} />
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
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={saveName}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="flex-1 bg-transparent outline-none text-[1.05rem] font-semibold tracking-tight"
        style={{ color: "var(--ink)" }}
      />
      {uploading && (
        <span className="text-[0.75rem]" style={{ color: "var(--text-dim)" }}>
          yükleniyor…
        </span>
      )}
      {uploadErr && (
        <span className="text-[0.75rem]" style={{ color: "var(--danger)" }}>
          {uploadErr}
        </span>
      )}
    </div>
  );
}

function PuzzleSection({ currentLength }: { currentLength: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="flex items-center justify-between p-4 gap-3">
        <div>
          <div
            className="text-[1.02rem] font-semibold tracking-tight"
            style={{ color: "var(--ink)" }}
          >
            9-nokta deseni
          </div>
          <div
            className="text-[0.82rem] mt-0.5 font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            {currentLength} nokta · aktif
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="btn-ghost"
          style={{ padding: "0.55rem 1rem", fontSize: "0.85rem" }}
        >
          <KeyRound size={14} strokeWidth={2} />
          değiştir
        </button>
      </div>
      {open && (
        <SimpleDialog
          open={true}
          onClose={() => setOpen(false)}
          title="yeni desen çiz"
        >
          <PuzzleSetter onDone={() => setOpen(false)} />
        </SimpleDialog>
      )}
    </>
  );
}
