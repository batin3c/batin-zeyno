import { PuzzleLock } from "@/components/puzzle-lock";

export default function PuzzlePage() {
  return (
    <main className="flex-1 relative flex flex-col items-center justify-center px-6 py-12">
      {/* top corners — archive metadata */}
      <div className="absolute top-6 inset-x-0 px-6 flex justify-between pointer-events-none">
        <span className="label-mono">özel arşiv</span>
        <span className="label-mono">no. 01 · tr</span>
      </div>

      {/* bottom corners — small caption */}
      <div className="absolute bottom-6 inset-x-0 px-6 flex justify-between pointer-events-none">
        <span className="label-mono opacity-60">b · z</span>
        <span className="label-mono opacity-60">est. 2026</span>
      </div>

      <div className="text-center animate-rise max-w-md">
        <div className="label-mono mb-6">logbook açılıyor</div>
        <h1 className="font-serif italic text-[clamp(4.5rem,18vw,7.5rem)] leading-[0.95] tracking-tight text-[color:var(--ink)]">
          <span className="ink-highlight">baze</span>
        </h1>
        <div className="dashed-rule w-32 mx-auto mt-8 mb-4" />
        <p className="font-serif italic text-base text-[color:var(--ink-soft)]">
          ikimize özel tatil günlüğü
        </p>
      </div>

      <div className="mt-10 animate-rise [animation-delay:140ms]">
        <PuzzleLock />
      </div>
    </main>
  );
}
