import Link from "next/link";
import { PickMemberForm } from "@/components/pick-member-form";

export const dynamic = "force-dynamic";

export default function PickMemberPage() {
  return (
    <main className="flex-1 relative flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
      <div
        aria-hidden
        className="absolute bottom-[-4vh] right-[-2vw] page-numeral"
      >
        ?
      </div>
      <div className="absolute top-8 left-6 right-6 flex items-center justify-between pointer-events-none">
        <span className="label">baze</span>
        <span className="label">gizli</span>
      </div>
      <div className="flex flex-col items-center gap-7 w-full max-w-sm">
        <div className="text-center anim-reveal">
          <h1
            className="display leading-[1.0]"
            style={{ fontSize: "2.6rem", color: "var(--ink)" }}
          >
            baze
          </h1>
          <p
            className="mt-3 text-[0.9rem] font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            ad gir, başla
          </p>
        </div>

        <div
          className="w-full"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--ink)",
            borderRadius: "20px",
            boxShadow: "var(--shadow-pop)",
            padding: "1.25rem",
          }}
        >
          <PickMemberForm />
        </div>

        <Link
          href="/katil"
          className="text-sm font-medium underline decoration-2 underline-offset-4"
          style={{ color: "var(--text-muted)" }}
        >
          davet kodum var
        </Link>
      </div>
    </main>
  );
}
