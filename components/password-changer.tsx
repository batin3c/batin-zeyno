"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { changePassword } from "@/app/actions/auth";

export function PasswordChanger() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
    setSaved(false);
  };

  const onSave = () => {
    setError(null);
    setSaved(false);
    if (next.length < 6) {
      setError("yeni şifre en az 6 karakter");
      return;
    }
    if (next !== confirm) {
      setError("yeni şifreler eşleşmiyor");
      return;
    }
    startTransition(async () => {
      const r = await changePassword({
        currentPassword: current,
        newPassword: next,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSaved(true);
      reset();
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setOpen(false);
      }, 1400);
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary"
        style={{
          padding: "0.55rem 0.9rem",
          fontSize: "0.85rem",
          width: "100%",
          justifyContent: "center",
        }}
      >
        şifremi değiştir
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="label" style={{ fontSize: "0.62rem" }}>
        şifre değiştir{" "}
        {saved && <span style={{ color: "var(--accent)" }}>✓ kaydedildi</span>}
      </span>
      <input
        type="password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        placeholder="mevcut şifre"
        autoComplete="current-password"
        className="field-input"
      />
      <input
        type="password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        placeholder="yeni şifre (en az 6 karakter)"
        autoComplete="new-password"
        className="field-input"
      />
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="yeni şifre (tekrar)"
        autoComplete="new-password"
        className="field-input"
      />
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          disabled={pending}
          style={{
            padding: "0.45rem 0.9rem",
            fontSize: "0.85rem",
            background: "transparent",
            border: "2px solid var(--ink)",
            borderRadius: 999,
            color: "var(--ink)",
            fontWeight: 600,
          }}
        >
          vazgeç
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={pending || !current || !next || !confirm}
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
