"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setupGroup } from "@/app/actions/auth";
import type { Member } from "@/lib/types";

const SIZE = 280;
const PAD = 38;
const DOT_R = 6;
const DOT_R_ACTIVE = 9;
const HIT_R = 44;

const DOTS = Array.from({ length: 9 }, (_, i) => {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const step = (SIZE - PAD * 2) / 2;
  return { i, x: PAD + col * step, y: PAD + row * step };
});

export function GroupSetupForm({
  groupId,
  members,
}: {
  groupId: string;
  members: Member[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawing = useRef(false);
  const [pattern, setPattern] = useState<number[]>([]);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [memberId, setMemberId] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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

  const startDraw = (clientX: number, clientY: number) => {
    drawing.current = true;
    setPattern([]);
    setError(null);
    const p = localPoint(clientX, clientY);
    if (!p) return;
    setPointer(p);
    const i = dotUnder(p.x, p.y);
    if (i !== null) setPattern([i]);
  };

  const move = (clientX: number, clientY: number) => {
    if (!drawing.current) return;
    const p = localPoint(clientX, clientY);
    if (!p) return;
    setPointer(p);
    const i = dotUnder(p.x, p.y);
    if (i !== null) {
      setPattern((prev) => (prev.includes(i) ? prev : [...prev, i]));
    }
  };

  const endDraw = () => {
    drawing.current = false;
    setPointer(null);
  };

  const reset = () => {
    setPattern([]);
    setPointer(null);
    setError(null);
  };

  const submit = () => {
    if (pattern.length < 3) {
      setError("en az 3 nokta");
      return;
    }
    if (!memberId) {
      setError("kim olduğunu seç");
      return;
    }
    startTransition(async () => {
      const r = await setupGroup({ groupId, pattern, memberId });
      if (!r.ok) {
        setError(r.error ?? "olmadı");
        return;
      }
      router.push("/");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <div
        className="w-[min(280px,72vw)] aspect-square"
        style={{ touchAction: "none" }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) startDraw(t.clientX, t.clientY);
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          if (t) move(t.clientX, t.clientY);
        }}
        onTouchEnd={endDraw}
        onTouchCancel={endDraw}
        onMouseDown={(e) => startDraw(e.clientX, e.clientY)}
        onMouseMove={(e) => {
          if (drawing.current) move(e.clientX, e.clientY);
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
                  stroke="var(--accent)"
                  strokeWidth={4}
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
              stroke="var(--accent)"
              strokeWidth={4}
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
                  fill={active ? "var(--accent)" : "var(--surface-2)"}
                  stroke="var(--ink)"
                  strokeWidth={2}
                  style={{
                    transition: "r 200ms ease, fill 160ms ease",
                  }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div
        className="text-[0.82rem] font-medium"
        style={{
          color:
            pattern.length >= 3 ? "var(--accent)" : "var(--text-muted)",
        }}
      >
        {pattern.length === 0
          ? "deseni çiz"
          : pattern.length < 3
          ? "en az 3 nokta"
          : `${pattern.length} nokta · ${pattern.join("-")}`}
      </div>

      {pattern.length > 0 && (
        <button
          type="button"
          onClick={reset}
          className="btn-chip"
          style={{ background: "var(--surface)" }}
        >
          baştan
        </button>
      )}

      <div className="w-full">
        <div
          className="label mb-2 text-center"
          style={{ fontSize: "0.62rem" }}
        >
          kim girdi?
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMemberId(m.id)}
              className="btn-chip"
              style={{
                background:
                  memberId === m.id ? "var(--accent-2)" : "var(--surface)",
                fontWeight: memberId === m.id ? 700 : 500,
              }}
            >
              {m.name.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-[0.85rem]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending || pattern.length < 3 || !memberId}
        className="btn-primary w-full"
        style={{ padding: "0.85rem 1.25rem" }}
      >
        {pending ? "kaydediliyor…" : "kur ve gir"}
      </button>
    </div>
  );
}
