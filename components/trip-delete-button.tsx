"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteTrip } from "@/app/actions/trips";

export function TripDeleteButton({
  tripId,
  tripName,
}: {
  tripId: string;
  tripName: string;
}) {
  const [pending, startTransition] = useTransition();

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`"${tripName}" sikilsin mi? tüm yerler de gider aq.`)) return;
    const fd = new FormData();
    fd.set("id", tripId);
    startTransition(() => deleteTrip(fd));
  };

  return (
    <button
      onClick={onClick}
      disabled={pending}
      aria-label="tatili siktir et"
      className="absolute top-3 right-3 flex items-center justify-center disabled:opacity-50"
      style={{
        width: "34px",
        height: "34px",
        background: "var(--danger-soft)",
        border: "2px solid var(--ink)",
        borderRadius: "12px",
        color: "var(--ink)",
        boxShadow: "2px 2px 0 var(--ink)",
      }}
    >
      <Trash2 size={16} strokeWidth={2.5} />
    </button>
  );
}
