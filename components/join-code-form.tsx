"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function JoinCodeForm() {
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length === 0) return;
    startTransition(() => {
      router.push(`/katil/${encodeURIComponent(clean)}`);
    });
  };

  return (
    <form onSubmit={submit} className="w-full flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="label" htmlFor="invite-code">
          davet kodu
        </label>
        <input
          id="invite-code"
          className="field-input"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={12}
          autoFocus
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          disabled={pending}
          style={{
            letterSpacing: "0.18em",
            textAlign: "center",
            fontFamily:
              "var(--font-jetbrains, ui-monospace, monospace)",
            fontSize: "1.1rem",
          }}
        />
      </div>

      <button
        type="submit"
        className="btn-primary w-full justify-center"
        disabled={pending || code.trim().length === 0}
      >
        {pending ? "bakıyorum..." : "devam"}
      </button>
    </form>
  );
}
