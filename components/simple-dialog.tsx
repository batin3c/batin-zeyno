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
        className="absolute inset-0 anim-fade-in"
        style={{
          background: "color-mix(in srgb, var(--text) 50%, transparent)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />
      <div
        className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto anim-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg)",
          border: "1px solid var(--line)",
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -10px 50px -10px color-mix(in srgb, var(--text) 35%, transparent)",
        }}
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <h2 className="text-[1.15rem] font-semibold tracking-tight leading-tight">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="btn-icon -mr-2 -mt-1"
              aria-label="kapat aq"
            >
              <X size={18} strokeWidth={1.75} />
            </button>
          </div>
          {children}
        </div>
      </div>
      <style jsx>{`
        @media (min-width: 640px) {
          div[class*="anim-scale-in"] {
            border-radius: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
