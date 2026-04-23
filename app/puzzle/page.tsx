import { PuzzleLock } from "@/components/puzzle-lock";

export default function PuzzlePage() {
  return (
    <main className="flex-1 relative flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
      {/* signature: ghost page numeral */}
      <div
        aria-hidden
        className="absolute bottom-[-4vh] right-[-2vw] page-numeral"
      >
        Ⅰ
      </div>

      <div className="absolute top-8 left-6 right-6 flex items-center justify-between pointer-events-none">
        <span className="label">baze</span>
        <span className="label">private</span>
      </div>

      <div className="flex flex-col items-center gap-10 anim-reveal">
        <div className="text-center">
          <h1
            className="display leading-[0.95]"
            style={{ fontSize: "3.5rem", color: "var(--ink)" }}
          >
            baze
          </h1>
          <p
            className="mt-3 text-[0.95rem] font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            ikimize özel
          </p>
        </div>

        <PuzzleLock />
      </div>
    </main>
  );
}
