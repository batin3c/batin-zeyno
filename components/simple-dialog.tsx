"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function SimpleDialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(28, 24, 20, 0.55)" }}
      />
      <div
        className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto animate-rise"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--paper)",
          border: "1px solid var(--faded)",
          boxShadow:
            "0 25px 60px rgba(28,24,20,0.35), 0 8px 16px rgba(28,24,20,0.15)",
        }}
      >
        {/* decorative inner dashed frame */}
        <div
          className="absolute inset-[6px] pointer-events-none"
          style={{
            border: "1px dashed var(--faded)",
          }}
        />
        {/* content */}
        <div className="relative p-6">
          <div className="flex items-start justify-between mb-5 gap-4">
            <div>
              <div className="label-mono mb-1">form</div>
              <h2 className="font-serif italic text-[1.5rem] leading-tight text-[color:var(--ink)]">
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 -mt-2 p-2 text-[color:var(--ink-soft)] hover:text-[color:var(--stamp)] transition-colors"
              aria-label="Kapat"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>
          <div className="dashed-rule mb-5" />
          {children}
        </div>
      </div>
    </div>
  );
}
