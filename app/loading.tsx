export default function Loading() {
  // home page contributes only the header — globe is in root layout, persists across nav
  return (
    <header
      className="sticky top-0 z-20"
      style={{
        background: "var(--bg)",
        borderBottom: "2px solid var(--ink)",
      }}
    >
      <div className="flex items-center gap-2 px-4 h-16 max-w-3xl mx-auto">
        <span
          className="font-bold tracking-tight px-1"
          style={{
            fontSize: "1.3rem",
            color: "var(--ink)",
            letterSpacing: "-0.03em",
          }}
        >
          baze
        </span>
      </div>
    </header>
  );
}
