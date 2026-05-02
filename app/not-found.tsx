import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <div style={{ fontSize: "5rem", lineHeight: 1 }}>🤷</div>
      <h1
        className="display"
        style={{ fontSize: "2.4rem", color: "var(--ink)" }}
      >
        burada bir şey yok
      </h1>
      <p
        className="text-[0.95rem] max-w-sm"
        style={{ color: "var(--text-muted)" }}
      >
        link bozuk olabilir, ya da bu içerik silinmiş.
      </p>
      <Link href="/" className="btn-primary">
        ana sayfaya dön
      </Link>
    </main>
  );
}
