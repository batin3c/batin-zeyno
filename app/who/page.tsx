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
    <main className="flex-1 relative flex flex-col items-center justify-center px-6 py-12">
      <div className="absolute top-6 inset-x-0 px-6 flex justify-between pointer-events-none">
        <span className="label-mono">mühür onaylandı</span>
        <span className="label-mono">kimlik · 02</span>
      </div>

      <div className="text-center mb-12 animate-rise">
        <div className="label-mono mb-4">seç bakalım</div>
        <h1 className="font-serif italic text-[clamp(2.4rem,8vw,3.6rem)] leading-tight text-[color:var(--ink)]">
          who the fuck <br />
          <span className="ink-highlight">are you?</span>
        </h1>
      </div>

      <div className="animate-rise [animation-delay:140ms]">
        <IdentityPicker members={members} />
      </div>

      <div className="absolute bottom-6 inset-x-0 px-6 flex justify-center pointer-events-none">
        <span className="label-mono opacity-60">
          her cihaz 30 gün hatırlar
        </span>
      </div>
    </main>
  );
}
