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
      aria-label="çık"
      title="çık"
    >
      <LogOut size={17} strokeWidth={2} />
    </button>
  );
}

export function LogoutLargeButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => logout())}
      disabled={pending}
      className="flex items-center justify-center gap-2 w-full font-bold disabled:opacity-50"
      style={{
        background: "var(--danger)",
        color: "#fff",
        border: "2px solid var(--ink)",
        borderRadius: "14px",
        padding: "0.85rem 1rem",
        fontSize: "1rem",
        boxShadow: "var(--shadow-pop)",
      }}
      aria-label="çık"
    >
      <LogOut size={18} strokeWidth={2.5} />
      çık
    </button>
  );
}
