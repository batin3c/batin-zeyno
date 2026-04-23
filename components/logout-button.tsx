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
      className="btn-icon disabled:opacity-50"
      aria-label="s'tir"
      title="s'tir"
    >
      <LogOut size={17} strokeWidth={1.5} />
    </button>
  );
}
