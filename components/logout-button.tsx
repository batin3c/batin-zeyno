"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";
import { logout } from "@/app/actions/auth";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => logout())}
      disabled={pending}
      className="p-2 text-[color:var(--ink-soft)] hover:text-[color:var(--stamp)] transition-colors disabled:opacity-50"
      aria-label="Çıkış"
      title="Çıkış"
    >
      <LogOut size={17} strokeWidth={1.5} />
    </button>
  );
}
