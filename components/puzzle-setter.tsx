"use client";

import { useRef, useState, useTransition } from "react";
import { savePuzzlePattern } from "@/app/actions/settings";

const SIZE = 320;
const PAD = 50;
const DOT_R = 11;
const HIT_R = 46;

const DOTS = Array.from({ length: 9 }, (_, i) => {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const step = (SIZE - PAD * 2) / 2;
  return { i, x: PAD + col * step, y: PAD + row * step };
});

const JITTER = [-3, 2, -1, 4, -2, 3, -4, 1, -2];

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
          setError("eşleşmedi — baştan");
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
        setTimeout(onDone, 1000);
      });
    }
  };

  const strokeColor =
    step === "mismatch"
      ? "var(--stamp)"
      : step === "done"
      ? "var(--sea)"
      : "var(--ink)";

  const label =
    step === "first"
      ? "yeni mührü çiz"
      : step === "second"
      ? "onay için bir daha"
      : step === "mismatch"
      ? "eşleşmedi"
      : step === "saving"
      ? "kaydediliyor…"
      : "kaydedildi ✓";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="font-serif italic text-base" style={{ color: strokeColor }}>
        — {label} —
      </div>
      <div
        className={`stamp-frame p-4 ${step === "mismatch" ? "animate-shake" : ""}`}
      >
        <div
          className="w-[min(240px,70vw)] aspect-square"
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
                    stroke={strokeColor}
                    strokeWidth={5}
                    strokeLinecap="round"
                    opacity={0.85}
                  />
                );
              })}
            {current.length > 0 && pointer && (
              <line
                x1={DOTS[current[current.length - 1]].x}
                y1={DOTS[current[current.length - 1]].y}
                x2={pointer.x}
                y2={pointer.y}
                stroke={strokeColor}
                strokeWidth={5}
                strokeLinecap="round"
                opacity={0.4}
                strokeDasharray="2 5"
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
                    r={DOT_R + 6}
                    fill="none"
                    stroke={active ? strokeColor : "var(--faded)"}
                    strokeWidth={active ? 1.5 : 1}
                    strokeDasharray={active ? "none" : "2 3"}
                    opacity={active ? 0.6 : 0.5}
                  />
                  <circle
                    cx={d.x}
                    cy={d.y}
                    r={DOT_R}
                    fill={active ? strokeColor : "var(--faded)"}
                    opacity={active ? 1 : 0.35}
                    style={{
                      transition:
                        "fill 140ms, transform 160ms cubic-bezier(.16,1,.3,1)",
                      transformOrigin: `${d.x}px ${d.y}px`,
                      transform: active
                        ? `scale(1.25) rotate(${JITTER[d.i]}deg)`
                        : "scale(1)",
                    }}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      {error && (
        <p className="font-mono text-[0.7rem] tracking-wider uppercase text-[color:var(--stamp)]">
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
