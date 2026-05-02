"use client";

import { useRef, useState, useTransition } from "react";
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

const SIZE = 240;
const PAD = 32;
const DOT_R = 5;
const DOT_R_ACTIVE = 8;
const HIT_R = 38;
const DOTS = Array.from({ length: 9 }, (_, i) => {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const step = (SIZE - PAD * 2) / 2;
  return { i, x: PAD + col * step, y: PAD + row * step };
});

export function NewGroupForm({
  needsMemberName = false,
}: {
  needsMemberName?: boolean;
}) {
  const [name, setName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [pattern, setPattern] = useState<number[]>([]);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const drawing = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const localPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const scale = SIZE / rect.width;
    return {
      x: (clientX - rect.left) * scale,
      y: (clientY - rect.top) * scale,
    };
  };
  const dotUnder = (x: number, y: number) => {
    for (const d of DOTS) {
      const dx = d.x - x;
      const dy = d.y - y;
      if (dx * dx + dy * dy <= HIT_R * HIT_R) return d.i;
    }
    return null;
  };
  const startDraw = (cx: number, cy: number) => {
    drawing.current = true;
    setPattern([]);
    const p = localPoint(cx, cy);
    if (!p) return;
    setPointer(p);
    const i = dotUnder(p.x, p.y);
    if (i !== null) setPattern([i]);
  };
  const moveDraw = (cx: number, cy: number) => {
    if (!drawing.current) return;
    const p = localPoint(cx, cy);
    if (!p) return;
    setPointer(p);
    const i = dotUnder(p.x, p.y);
    if (i !== null) setPattern((prev) => (prev.includes(i) ? prev : [...prev, i]));
  };
  const endDraw = () => {
    drawing.current = false;
    setPointer(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("grup ismi boş");
      return;
    }
    if (pattern.length < 3) {
      setError("desende en az 3 nokta");
      return;
    }
    if (needsMemberName && !memberName.trim()) {
      setError("adın boş");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createGroup({
        name: trimmed,
        color,
        pattern,
        memberName: needsMemberName ? memberName.trim() : undefined,
      });
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
          placeholder="batın & zeynep"
          maxLength={60}
          autoFocus
          disabled={pending}
        />
      </div>

      {needsMemberName && (
        <div className="flex flex-col gap-2">
          <label className="label" htmlFor="member-name">
            senin adın
          </label>
          <input
            id="member-name"
            className="field-input"
            type="text"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            placeholder="batın"
            maxLength={40}
            disabled={pending}
          />
        </div>
      )}

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

      <div className="flex flex-col gap-2 items-center">
        <span className="label">desen (şifre)</span>
        <div
          className="w-[min(240px,68vw)] aspect-square"
          style={{ touchAction: "none" }}
          onTouchStart={(e) => {
            const t = e.touches[0];
            if (t) startDraw(t.clientX, t.clientY);
          }}
          onTouchMove={(e) => {
            const t = e.touches[0];
            if (t) moveDraw(t.clientX, t.clientY);
          }}
          onTouchEnd={endDraw}
          onTouchCancel={endDraw}
          onMouseDown={(e) => startDraw(e.clientX, e.clientY)}
          onMouseMove={(e) => {
            if (drawing.current) moveDraw(e.clientX, e.clientY);
          }}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="w-full h-full pointer-events-none"
          >
            {pattern.length > 1 &&
              pattern.slice(0, -1).map((from, idx) => {
                const a = DOTS[from];
                const b = DOTS[pattern[idx + 1]];
                return (
                  <line
                    key={`${from}-${pattern[idx + 1]}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={color}
                    strokeWidth={3.5}
                    strokeLinecap="round"
                  />
                );
              })}
            {pattern.length > 0 && pointer && (
              <line
                x1={DOTS[pattern[pattern.length - 1]].x}
                y1={DOTS[pattern[pattern.length - 1]].y}
                x2={pointer.x}
                y2={pointer.y}
                stroke={color}
                strokeWidth={3.5}
                strokeLinecap="round"
                opacity={0.4}
              />
            )}
            {DOTS.map((d) => {
              const active = pattern.includes(d.i);
              return (
                <g key={d.i}>
                  <circle cx={d.x} cy={d.y} r={HIT_R} fill="transparent" />
                  <circle
                    cx={d.x}
                    cy={d.y}
                    r={active ? DOT_R_ACTIVE : DOT_R}
                    fill={active ? color : "var(--surface-2)"}
                    stroke="var(--ink)"
                    strokeWidth={2}
                    style={{ transition: "r 200ms ease, fill 160ms ease" }}
                  />
                </g>
              );
            })}
          </svg>
        </div>
        <p className="text-[0.78rem]" style={{ color: "var(--text-muted)" }}>
          {pattern.length === 0
            ? "üyeler bu desenle girecek"
            : pattern.length < 3
            ? "en az 3 nokta"
            : `${pattern.length} nokta`}
        </p>
      </div>

      {error && (
        <p className="text-sm anim-fade-in" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        className="btn-primary w-full justify-center mt-1"
        disabled={pending || name.trim().length === 0 || pattern.length < 3}
      >
        {pending ? "yapıyorum..." : "kur"}
      </button>
    </form>
  );
}
