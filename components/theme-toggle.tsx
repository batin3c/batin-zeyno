"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const t = document.documentElement.getAttribute("data-theme");
  return t === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(readTheme());
  }, []);

  const apply = (next: Theme) => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("baze-theme", next);
    } catch {}
    setTheme(next);
  };

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <div className="flex items-center justify-between p-4 gap-3">
      <div className="flex flex-col gap-0.5">
        <div
          className="text-[1.02rem] font-semibold tracking-tight"
          style={{ color: "var(--ink)" }}
        >
          tema
        </div>
        <div
          className="text-[0.82rem] font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          {isDark ? "karanlık" : "aydınlık"}
        </div>
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => apply("light")}
          aria-label="aydınlık"
          className="flex items-center justify-center"
          style={{
            width: "44px",
            height: "44px",
            background: !isDark ? "var(--accent)" : "var(--surface)",
            color: "var(--ink)",
            border: "2px solid var(--ink)",
            borderRadius: "12px",
            boxShadow: !isDark ? "var(--shadow-pop-sm)" : "none",
          }}
        >
          <Sun size={18} strokeWidth={2.25} />
        </button>
        <button
          type="button"
          onClick={() => apply("dark")}
          aria-label="karanlık"
          className="flex items-center justify-center"
          style={{
            width: "44px",
            height: "44px",
            background: isDark ? "var(--accent)" : "var(--surface)",
            color: "var(--ink)",
            border: "2px solid var(--ink)",
            borderRadius: "12px",
            boxShadow: isDark ? "var(--shadow-pop-sm)" : "none",
          }}
        >
          <Moon size={18} strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
