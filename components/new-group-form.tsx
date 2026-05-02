"use client";

import { useState, useTransition } from "react";
import { createGroup } from "@/app/actions/auth";

const COLORS = [
  "#ff6b9d",
  "#4ecdc4",
  "#ffd166",
  "#a78bfa",
  "#06d6a0",
  "#f4845f",
  "#118ab2",
  "#ef476f",
];

export function NewGroupForm() {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("grup ismi boş");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createGroup({ name: trimmed, color });
      if (result && !result.ok) setError(result.error);
    });
  };

  return (
    <form onSubmit={submit} className="w-full flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className="label" htmlFor="group-name">
          grup ismi
        </label>
        <input
          id="group-name"
          className="field-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="grubun adı"
          maxLength={60}
          autoFocus
          disabled={pending}
        />
      </div>

      <div className="flex flex-col gap-3">
        <span className="label">renk</span>
        <div className="flex flex-wrap gap-3">
          {COLORS.map((c) => {
            const active = c === color;
            return (
              <button
                key={c}
                type="button"
                aria-label={`renk ${c}`}
                onClick={() => setColor(c)}
                disabled={pending}
                style={{
                  width: 38,
                  height: 38,
                  background: c,
                  border: "2px solid var(--ink)",
                  borderRadius: "999px",
                  cursor: "pointer",
                  boxShadow: active
                    ? "var(--shadow-pop)"
                    : "var(--shadow-pop-sm)",
                  transform: active ? "translate(-1px,-1px)" : "none",
                  transition: "transform 140ms ease, box-shadow 140ms ease",
                  position: "relative",
                }}
              >
                {active && (
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--ink)",
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      lineHeight: 1,
                    }}
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="text-sm anim-fade-in" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        className="btn-primary w-full justify-center mt-1"
        disabled={pending || name.trim().length === 0}
      >
        {pending ? "yapıyorum..." : "kur"}
      </button>
    </form>
  );
}
