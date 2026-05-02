"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Globe2, UserCircle2 } from "lucide-react";

const TABS = [
  { href: "/tatiller", icon: Briefcase, label: "tatiller" },
  { href: "/", icon: Globe2, label: "ana sayfa" },
  { href: "/profil", icon: UserCircle2, label: "profil" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  // hide on auth screens
  if (pathname === "/puzzle" || pathname === "/who") return null;

  const activeFor = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: "var(--bg)",
        borderTop: "2px solid var(--ink)",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="max-w-3xl mx-auto flex items-center justify-around px-4 pt-3.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeFor(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              className="flex items-center justify-center transition-transform active:translate-x-[2px] active:translate-y-[2px]"
              style={{
                width: "72px",
                height: "60px",
                background: active ? "var(--accent)" : "var(--surface)",
                color: "var(--ink)",
                border: "2px solid var(--ink)",
                borderRadius: "16px",
                boxShadow: active ? "var(--shadow-pop)" : "var(--shadow-pop-sm)",
              }}
            >
              <Icon size={26} strokeWidth={2.25} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
