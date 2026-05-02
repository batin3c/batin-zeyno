"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { createAccount } from "@/app/actions/auth";

export function PickMemberForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("adın boş");
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await createAccount(trimmed);
      if (r && !r.ok) {
        setError(r.error ?? "olmadı");
        return;
      }
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 w-full">
      <label className="label" htmlFor="auth-name">
        adın
      </label>
      <input
        id="auth-name"
        className="field-input"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="yeni isim"
        maxLength={40}
        autoFocus
        disabled={pending}
      />
      {error && (
        <p className="text-[0.85rem]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || name.trim().length === 0}
        className="btn-primary w-full justify-center"
        style={{ padding: "0.85rem 1.25rem" }}
      >
        {pending ? "açıyorum…" : "hesap aç"}
      </button>
    </form>
  );
}
