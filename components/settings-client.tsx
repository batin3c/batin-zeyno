"use client";

import { useState, useRef, useTransition } from "react";
import { Camera } from "lucide-react";
import {
  updateMemberName,
  updateMemberAvatar,
} from "@/app/actions/settings";
import { PushToggle } from "./push-toggle";
import { ThemeToggle } from "./theme-toggle";
import { GroupSection } from "./groups/group-section";
import type { Member, Group } from "@/lib/types";

export function SettingsClient({
  members,
  currentMemberId,
  activeGroup,
  myGroups,
  myRole,
}: {
  members: Member[];
  currentMemberId: string;
  activeGroup: Group | null;
  myGroups: Group[];
  myRole: "owner" | "member" | null;
  // legacy prop kept for prop-shape compatibility with the parent page;
  // ignored now that the puzzle pattern has been removed
  currentPatternLength?: number;
}) {
  return (
    <div className="flex flex-col gap-10 pt-6">
      <GroupSection
        activeGroup={activeGroup}
        myGroups={myGroups}
        members={members}
        myRole={myRole}
        currentMemberId={currentMemberId}
      />

      <Section title="üyeler">
        <div className="flex flex-col">
          {members.map((m, i) => (
            <MemberRow key={m.id} member={m} last={i === members.length - 1} />
          ))}
        </div>
      </Section>

      <Section title="görünüm">
        <ThemeToggle />
      </Section>

      <Section title="bildirim">
        <PushToggle />
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
    if (!r.ok) setUploadErr(r.error ?? "yüklenmedi");
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

