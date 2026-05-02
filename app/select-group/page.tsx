import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember, getMemberGroups } from "@/lib/dal";
import { selectGroup } from "@/app/actions/auth";

export default async function SelectGroupPage() {
  const me = await getCurrentMember();
  if (!me) redirect("/puzzle");

  const groups = await getMemberGroups();

  if (groups.length === 0) {
    redirect("/yeni-grup");
  }
  // server components can't write cookies — even for the 1-group case,
  // the user clicks the form button (which fires the selectGroup server
  // action) to set the active group.

  return (
    <main className="flex-1 relative flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
      <div
        aria-hidden
        className="absolute bottom-[-4vh] left-[-2vw] page-numeral"
      >
        Ⅱ
      </div>

      <div className="absolute top-8 left-6 right-6 flex items-center justify-between pointer-events-none">
        <span className="label">grup seç</span>
        <span className="label">{me.name?.toLowerCase()}</span>
      </div>

      <div className="flex flex-col items-center gap-8 w-full max-w-sm">
        <div className="text-center anim-reveal">
          <h1
            className="display leading-[1.0]"
            style={{ fontSize: "2.4rem", color: "var(--ink)" }}
          >
            hangi grup?
          </h1>
          <p
            className="mt-3 text-[0.9rem] font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            birden fazla yere takılmışsın
          </p>
        </div>

        <ul className="flex flex-col gap-3 w-full">
          {groups.map((g, idx) => (
            <li
              key={g.id}
              className="anim-reveal"
              style={{ animationDelay: `${idx * 70}ms` }}
            >
              <form action={selectGroup.bind(null, g.id)}>
                <button
                  type="submit"
                  className="w-full text-left flex items-center gap-3 transition-transform active:translate-x-[2px] active:translate-y-[2px] hover:-translate-x-[1px] hover:-translate-y-[1px]"
                  style={{
                    background: "var(--surface)",
                    border: "2px solid var(--ink)",
                    borderRadius: "16px",
                    padding: "0.9rem 1rem",
                    boxShadow: "var(--shadow-pop)",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 12,
                      height: 12,
                      background: g.color ?? "var(--accent)",
                      border: "2px solid var(--ink)",
                      borderRadius: "999px",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    className="font-semibold"
                    style={{ color: "var(--ink)", fontSize: "1.05rem" }}
                  >
                    {g.name}
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>

        <div
          className="w-full flex flex-col gap-2 pt-3 mt-2"
          style={{ borderTop: "2px dashed var(--line-soft)" }}
        >
          <Link href="/yeni-grup" className="btn-chip w-full justify-center">
            yeni grup oluştur
          </Link>
          <Link href="/katil" className="btn-chip w-full justify-center">
            gruba katıl
          </Link>
        </div>
      </div>
    </main>
  );
}
