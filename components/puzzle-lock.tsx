"use client";

import { useRef, useState, useTransition } from "react";
import { checkPuzzle } from "@/app/actions/auth";
import { useRouter } from "next/navigation";

const SIZE = 320;
const PAD = 50;
const DOT_R = 11;
const HIT_R = 46;

type Dot = { i: number; x: number; y: number };

const DOTS: Dot[] = Array.from({ length: 9 }, (_, i) => {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const step = (SIZE - PAD * 2) / 2;
  return { i, x: PAD + col * step, y: PAD + row * step };
});

// tiny deterministic rotation per dot — so active dots feel stamped, not generated
const JITTER = [-3, 2, -1, 4, -2, 3, -4, 1, -2];

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
        router.push("/who");
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

  const strokeColor =
    phase === "wrong"
      ? "var(--stamp)"
      : phase === "ok"
      ? "var(--sea)"
      : "var(--ink)";

  const labelColor =
    phase === "wrong"
      ? "var(--stamp)"
      : phase === "ok"
      ? "var(--sea)"
      : "var(--ink-soft)";

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        className={`stamp-frame p-5 ${phase === "wrong" ? "animate-shake" : ""}`}
        style={{
          transform: "rotate(-0.4deg)",
        }}
      >
        {/* corner markers */}
        <CornerMark corner="tl" />
        <CornerMark corner="tr" />
        <CornerMark corner="bl" />
        <CornerMark corner="br" />

        <div
          className="w-[min(280px,72vw)] aspect-square"
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
            {/* connecting lines — thick ink stroke */}
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
                    stroke={strokeColor}
                    strokeWidth={5}
                    strokeLinecap="round"
                    opacity={0.85}
                  />
                );
              })}
            {pattern.length > 0 && pointer && (
              <line
                x1={DOTS[pattern[pattern.length - 1]].x}
                y1={DOTS[pattern[pattern.length - 1]].y}
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
              const active = pattern.includes(d.i);
              const order = active ? pattern.indexOf(d.i) + 1 : 0;
              return (
                <g key={d.i}>
                  <circle cx={d.x} cy={d.y} r={HIT_R} fill="transparent" />
                  {/* outer ring */}
                  <circle
                    cx={d.x}
                    cy={d.y}
                    r={DOT_R + 6}
                    fill="none"
                    stroke={active ? strokeColor : "var(--faded)"}
                    strokeWidth={active ? 1.5 : 1}
                    strokeDasharray={active ? "none" : "2 3"}
                    opacity={active ? 0.6 : 0.55}
                    style={{ transition: "stroke 180ms" }}
                  />
                  {/* center dot — rubber-stamp feel when active */}
                  <circle
                    cx={d.x}
                    cy={d.y}
                    r={DOT_R}
                    fill={active ? strokeColor : "var(--faded)"}
                    opacity={active ? 1 : 0.35}
                    style={{
                      transition:
                        "fill 140ms ease, transform 160ms cubic-bezier(.16,1,.3,1), opacity 140ms",
                      transformOrigin: `${d.x}px ${d.y}px`,
                      transform: active
                        ? `scale(1.25) rotate(${JITTER[d.i]}deg)`
                        : "scale(1) rotate(0deg)",
                    }}
                  />
                  {active && (
                    <text
                      x={d.x}
                      y={d.y + 2.5}
                      textAnchor="middle"
                      fontSize={8.5}
                      fontFamily="var(--font-dm-mono), monospace"
                      fill="var(--paper)"
                      fontWeight={600}
                      style={{ pointerEvents: "none" }}
                    >
                      {order}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div
        className="h-5 text-center font-serif italic text-[0.92rem]"
        style={{ color: labelColor }}
      >
        {phase === "wrong" && <span>— {wrongLine(wrongCount)} —</span>}
        {phase === "ok" && <span>— mühür uyuyor… —</span>}
        {phase === "idle" && pattern.length === 0 && (
          <span>— desenini çiz —</span>
        )}
      </div>
    </div>
  );
}

function CornerMark({ corner }: { corner: "tl" | "tr" | "bl" | "br" }) {
  const pos: Record<string, string> = {
    tl: "top-2 left-2 border-t border-l",
    tr: "top-2 right-2 border-t border-r",
    bl: "bottom-2 left-2 border-b border-l",
    br: "bottom-2 right-2 border-b border-r",
  };
  return (
    <span
      className={`absolute w-2.5 h-2.5 pointer-events-none ${pos[corner]}`}
      style={{ borderColor: "var(--ink)" }}
    />
  );
}

function wrongLine(n: number): string {
  if (n === 1) return "ıııh, değil";
  if (n === 2) return "hadi ama";
  if (n === 3) return "sen baze'nin sahibi değilsin galiba";
  if (n >= 4) return "tamam git artık";
  return "yanlış";
}
