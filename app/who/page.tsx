import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMembers } from "@/lib/dal";
import { IdentityPicker } from "@/components/identity-picker";

export default async function WhoPage() {
  const store = await cookies();
  if (store.get("baze_puzzle_ok")?.value !== "1") {
    redirect("/puzzle");
  }
  const members = await getMembers();
  return (
    <main className="flex-1 relative flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
      <div
        aria-hidden
        className="absolute bottom-[-4vh] left-[-2vw] page-numeral"
      >
        Ⅱ
      </div>

      <div className="absolute top-8 left-6 right-6 flex items-center justify-between pointer-events-none">
        <span className="label">kimlik</span>
        <span className="label">02</span>
      </div>

      <div className="flex flex-col items-center gap-10 w-full max-w-sm">
        <div className="text-center anim-reveal">
          <h1 className="display text-[2.25rem] leading-[1.05] text-[color:var(--text)]">
            who are <br />
            you?
          </h1>
        </div>
        <IdentityPicker members={members} />
      </div>
    </main>
  );
}
