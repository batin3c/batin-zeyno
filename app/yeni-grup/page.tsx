import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember, getMemberGroups } from "@/lib/dal";
import { NewGroupForm } from "@/components/new-group-form";

export default async function NewGroupPage() {
  const me = await getCurrentMember();
  if (!me) redirect("/puzzle");

  const groups = await getMemberGroups();
  const hasOtherGroups = groups.length > 0;

  return (
    <main className="flex-1 relative flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
      <div
        aria-hidden
        className="absolute bottom-[-4vh] right-[-2vw] page-numeral"
      >
        Ⅲ
      </div>

      <div className="absolute top-8 left-6 right-6 flex items-center justify-between pointer-events-none">
        <span className="label">yeni grup</span>
        <span className="label">{me.name?.toLowerCase()}</span>
      </div>

      <div className="flex flex-col items-center gap-8 w-full max-w-sm anim-reveal">
        <div className="text-center">
          <h1
            className="display leading-[1.0]"
            style={{ fontSize: "2.4rem", color: "var(--ink)" }}
          >
            yeni grup aç
          </h1>
          <p
            className="mt-3 text-[0.9rem] font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            isim koy, renk seç, gerisi sende
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
          <NewGroupForm />
        </div>

        {hasOtherGroups && (
          <Link
            href="/select-group"
            className="text-sm font-medium underline decoration-2 underline-offset-4"
            style={{ color: "var(--text-muted)" }}
          >
            siktir et, gruplarıma dön
          </Link>
        )}
      </div>
    </main>
  );
}
