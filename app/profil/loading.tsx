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
          <h1 className="flex-1 text-center text-[1rem] font-semibold tracking-tight">
            profil
          </h1>
          <div style={{ minWidth: 40 }} />
        </div>
      </header>
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 pb-32" />
    </>
  );
}
