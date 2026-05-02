"use client";

import { useRef, useState, useTransition } from "react";
import { checkPuzzle } from "@/app/actions/auth";
import { useRouter } from "next/navigation";

const SIZE = 300;
const PAD = 42;
const DOT_R = 10;
const DOT_R_ACTIVE = 14;
const HIT_R = 44;

type Dot = { i: number; x: number; y: number };

const DOTS: Dot[] = Array.from({ length: 9 }, (_, i) => {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const step = (SIZE - PAD * 2) / 2;
  return { i, x: PAD + col * step, y: PAD + row * step };
});

type Phase = "idle" | "drawing" | "wrong" | "ok";

export function PuzzleLock() {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawing = useRef(false);
  const [pattern, setPattern] = useState<number[]>([]);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [wrongCount, setWrongCount] = useState(0);
  const [, startTransition] = useTransition();
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

  const start = (clientX: number, clientY: number) => {
    if (phase === "ok") return;
    drawing.current = true;
    setPattern([]);
    setPhase("drawing");
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

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setPointer(null);
    if (pattern.length < 3) {
      setPattern([]);
      setPhase("idle");
      return;
    }
    const attempt = pattern;
    startTransition(async () => {
      const result = await checkPuzzle(attempt);
      if (result.ok) {
        setPhase("ok");
        router.push(result.nextPath);
      } else {
        setPhase("wrong");
        setWrongCount((n) => n + 1);
        setTimeout(() => {
          setPattern([]);
          setPhase("idle");
        }, 820);
      }
    });
  };

  const stroke =
    phase === "wrong" ? "var(--danger)" :
    phase === "ok" ? "var(--accent-2)" :
    "var(--accent)";
  const dotInactive = "var(--surface-2)";
  const dotStroke = "var(--ink)";

  return (
    <div className="flex flex-col items-center gap-8">
      <div
        className={`w-[min(300px,80vw)] aspect-square ${
          phase === "wrong" ? "anim-shake" : ""
        }`}
        style={{ touchAction: "none" }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) start(t.clientX, t.clientY);
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          if (t) move(t.clientX, t.clientY);
        }}
        onTouchEnd={end}
        onTouchCancel={end}
        onMouseDown={(e) => start(e.clientX, e.clientY)}
        onMouseMove={(e) => {
          if (drawing.current) move(e.clientX, e.clientY);
        }}
        onMouseUp={end}
        onMouseLeave={end}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="w-full h-full pointer-events-none"
        >
          {/* connecting lines */}
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
                  stroke={stroke}
                  strokeWidth={5}
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
              stroke={stroke}
              strokeWidth={5}
              strokeLinecap="round"
              opacity={0.5}
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
                  fill={active ? stroke : dotInactive}
                  stroke={dotStroke}
                  strokeWidth={2.5}
                  style={{
                    transition:
                      "r 220ms cubic-bezier(.34,1.56,.64,1), fill 180ms ease",
                  }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="h-5 text-center">
        {phase === "wrong" && (
          <span
            className="text-sm anim-fade-in"
            style={{ color: "var(--danger)" }}
          >
            {wrongLine(wrongCount)}
          </span>
        )}
        {phase === "ok" && (
          <span
            className="text-sm anim-fade-in"
            style={{ color: "var(--accent)" }}
          >
oldu
          </span>
        )}
        {phase === "idle" && pattern.length === 0 && (
          <span className="text-sm" style={{ color: "var(--text-dim)" }}>
çiz bakalım
          </span>
        )}
      </div>
    </div>
  );
}

function wrongLine(n: number): string {
  if (n === 1) return "ıııh, değil";
  if (n === 2) return "hadi ya";
  if (n === 3) return "sen baze'nin sahibi değilsin galiba";
  if (n >= 4) return "git artık";
  return "yanlış";
}
