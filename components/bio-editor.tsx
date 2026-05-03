"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { updateBio } from "@/app/actions/profile";

export function BioEditor({ initialBio }: { initialBio: string | null }) {
  const [bio, setBio] = useState(initialBio ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSave = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const r = await updateBio(bio.trim());
      if (!r.ok) {
        setError(r.error ?? "kaydedilmedi");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1400);
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="label" style={{ fontSize: "0.62rem" }}>
        bio (max 200) {saved && <span style={{ color: "var(--accent)" }}>✓</span>}
      </span>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        rows={3}
        maxLength={200}
        placeholder="kendinden birkaç söz…"
        className="field-textarea"
      />
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[0.72rem]"
          style={{ color: "var(--text-dim)" }}
        >
          {bio.length}/200
        </span>
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="btn-primary"
          style={{ padding: "0.45rem 0.9rem", fontSize: "0.85rem" }}
        >
          <Check size={13} strokeWidth={2.5} />
          {pending ? "kaydediliyor…" : "kaydet"}
        </button>
      </div>
      {error && (
        <p className="text-[0.78rem]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
