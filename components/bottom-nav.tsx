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
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="max-w-3xl mx-auto flex items-center justify-around px-3 pt-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeFor(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              className="flex items-center justify-center transition-transform active:scale-95"
              style={{
                width: "60px",
                height: "52px",
                background: active ? "var(--accent)" : "transparent",
                color: "var(--ink)",
                border: active ? "2px solid var(--ink)" : "2px solid transparent",
                borderRadius: "16px",
                boxShadow: active ? "var(--shadow-pop-sm)" : "none",
              }}
            >
              <Icon size={24} strokeWidth={2.25} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
