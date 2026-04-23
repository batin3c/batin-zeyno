"use client";

import { useRef, useState, useTransition } from "react";
import { savePuzzlePattern } from "@/app/actions/settings";

const SIZE = 280;
const PAD = 38;
const DOT_R = 5;
const DOT_R_ACTIVE = 7;
const HIT_R = 44;

const DOTS = Array.from({ length: 9 }, (_, i) => {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const step = (SIZE - PAD * 2) / 2;
  return { i, x: PAD + col * step, y: PAD + row * step };
});

type Step = "first" | "second" | "saving" | "done" | "mismatch";

export function PuzzleSetter({ onDone }: { onDone: () => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawing = useRef(false);
  const [first, setFirst] = useState<number[]>([]);
  const [current, setCurrent] = useState<number[]>([]);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [step, setStep] = useState<Step>("first");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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
    if (step === "saving" || step === "done") return;
    drawing.current = true;
    setCurrent([]);
    setError(null);
    const p = localPoint(clientX, clientY);
    if (!p) return;
    setPointer(p);
    const i = dotUnder(p.x, p.y);
    if (i !== null) setCurrent([i]);
  };

  const move = (clientX: number, clientY: number) => {
    if (!drawing.current) return;
    const p = localPoint(clientX, clientY);
    if (!p) return;
    setPointer(p);
    const i = dotUnder(p.x, p.y);
    if (i !== null) {
      setCurrent((prev) => (prev.includes(i) ? prev : [...prev, i]));
    }
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setPointer(null);
    if (current.length < 3) {
      setCurrent([]);
      setError("en az 3 nokta");
      return;
    }
    if (step === "first") {
      setFirst(current);
      setCurrent([]);
      setStep("second");
      return;
    }
    if (step === "second") {
      if (!arraysEqual(first, current)) {
        setStep("mismatch");
        setTimeout(() => {
          setFirst([]);
          setCurrent([]);
          setStep("first");
          setError("eşleşmedi, baştan");
        }, 1000);
        return;
      }
      const saved = current;
      setStep("saving");
      startTransition(async () => {
        const r = await savePuzzlePattern(saved);
        if (!r.ok) {
          setError(r.error ?? "hata");
          setStep("first");
          setFirst([]);
          setCurrent([]);
          return;
        }
        setStep("done");
        setTimeout(onDone, 900);
      });
    }
  };

  const stroke =
    step === "mismatch" ? "var(--danger)" : "var(--accent)";

  const label =
    step === "first" ? "yeni deseni çiz" :
    step === "second" ? "bir daha, onay için" :
    step === "mismatch" ? "eşleşmedi" :
    step === "saving" ? "kaydediliyor" :
    "kaydedildi";

  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <div className="text-sm" style={{ color: step === "mismatch" ? "var(--danger)" : "var(--text-muted)" }}>
        {label}
      </div>
      <div
        className={`w-[min(260px,68vw)] aspect-square ${
          step === "mismatch" ? "anim-shake" : ""
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
          {current.length > 1 &&
            current.slice(0, -1).map((from, idx) => {
              const a = DOTS[from];
              const b = DOTS[current[idx + 1]];
              return (
                <line
                  key={`${from}-${current[idx + 1]}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={stroke}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  opacity={0.9}
                />
              );
            })}
          {current.length > 0 && pointer && (
            <line
              x1={DOTS[current[current.length - 1]].x}
              y1={DOTS[current[current.length - 1]].y}
              x2={pointer.x}
              y2={pointer.y}
              stroke={stroke}
              strokeWidth={2.5}
              strokeLinecap="round"
              opacity={0.3}
            />
          )}
          {DOTS.map((d) => {
            const active = current.includes(d.i);
            return (
              <g key={d.i}>
                <circle cx={d.x} cy={d.y} r={HIT_R} fill="transparent" />
                <circle
                  cx={d.x}
                  cy={d.y}
                  r={active ? DOT_R_ACTIVE : DOT_R}
                  fill={active ? stroke : "var(--text-dim)"}
                  style={{
                    transition:
                      "r 220ms cubic-bezier(.2,.8,.2,1), fill 180ms ease",
                  }}
                />
              </g>
            );
          })}
        </svg>
      </div>
      {error && (
        <p className="text-xs" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function arraysEqual(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
