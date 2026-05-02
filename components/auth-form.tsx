"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signUp, signIn } from "@/app/actions/auth";

type Mode = "signup" | "signin";

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const r =
        mode === "signup"
          ? await signUp({ email, password, name, surname })
          : await signIn({ email, password });
      // success path: action calls redirect(), so the next line only runs on error
      if (r && !r.ok) {
        setError(r.error ?? "olmadı");
        return;
      }
      router.refresh();
    });
  };

  const swap = () => {
    setMode((m) => (m === "signup" ? "signin" : "signup"));
    setError(null);
  };

  const canSubmit =
    email.trim().length > 0 &&
    password.length > 0 &&
    (mode === "signin" || (name.trim().length > 0 && surname.trim().length > 0));

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 w-full">
      {mode === "signup" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="label" htmlFor="auth-name">
              isim
            </label>
            <input
              id="auth-name"
              className="field-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="batın"
              maxLength={40}
              autoFocus
              disabled={pending}
              autoComplete="given-name"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="label" htmlFor="auth-surname">
              soyisim
            </label>
            <input
              id="auth-surname"
              className="field-input"
              type="text"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              placeholder="cezayirli"
              maxLength={40}
              disabled={pending}
              autoComplete="family-name"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="label" htmlFor="auth-email">
          e-posta
        </label>
        <input
          id="auth-email"
          className="field-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ornek@mail.com"
          maxLength={120}
          autoFocus={mode === "signin"}
          disabled={pending}
          autoComplete="email"
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="label" htmlFor="auth-password">
          şifre
        </label>
        <div className="relative">
          <input
            id="auth-password"
            className="field-input"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "en az 6 karakter" : "şifren"}
            disabled={pending}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            style={{ paddingRight: "3rem" }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[0.78rem] font-semibold px-2 py-1"
            style={{
              color: "var(--text-muted)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            tabIndex={-1}
          >
            {showPassword ? "gizle" : "göster"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[0.85rem]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !canSubmit}
        className="btn-primary w-full justify-center"
        style={{ padding: "0.85rem 1.25rem" }}
      >
        {pending
          ? mode === "signup"
            ? "açıyorum…"
            : "geçiyor…"
          : mode === "signup"
          ? "hesap aç"
          : "gir"}
      </button>

      <button
        type="button"
        onClick={swap}
        disabled={pending}
        className="text-sm font-medium underline decoration-2 underline-offset-4 self-center"
        style={{ color: "var(--text-muted)" }}
      >
        {mode === "signup" ? "zaten hesabım var" : "yeni hesap aç"}
      </button>
    </form>
  );
}
