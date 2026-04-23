"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 anim-fade-in"
        style={{
          background: "color-mix(in srgb, var(--ink) 45%, transparent)",
        }}
      />
      <div
        className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto anim-bounce-in dialog-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "2px solid var(--ink)",
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -8px 0 var(--ink)",
        }}
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <h2
              className="font-bold tracking-tight leading-tight"
              style={{ fontSize: "1.3rem", color: "var(--ink)" }}
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="btn-icon"
              aria-label="kapat aq"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
          {children}
        </div>
      </div>
      <style jsx>{`
        @media (min-width: 640px) {
          .dialog-content {
            border-radius: 24px !important;
            box-shadow: var(--shadow-pop-lg) !important;
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
