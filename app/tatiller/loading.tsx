export default function Loading() {
  return (
    <>
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
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 pt-8 pb-32">
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="label" style={{ opacity: 0.4 }}>
              arşiv
            </span>
            <h1
              className="display mt-2"
              style={{ fontSize: "2.75rem", color: "var(--ink)", opacity: 0.6 }}
            >
              tatiller
            </h1>
          </div>
        </div>
      </main>
    </>
  );
}
