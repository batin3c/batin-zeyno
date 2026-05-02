"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useJsApiLoader } from "@react-google-maps/api";
import {
  backfillCityPhotosFromUrls,
  backfillAllCitiesFromGoogle,
  backfillAllLocationsFromGoogle,
} from "@/app/actions/cities";
import {
  backfillLocationPhotosFromUrls,
} from "@/app/actions/locations";

type Item = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  google_place_id: string | null;
};

type Status = "pending" | "fetching" | "done" | "skipped" | "error";

const LIBRARIES: ("places")[] = ["places"];

export function BackfillClient({
  cities,
  locations,
  memberName,
}: {
  cities: Item[];
  locations: Item[];
  memberName: string;
}) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: LIBRARIES,
    language: "tr",
  });
  const [running, setRunning] = useState(false);
  const [pending, startTransition] = useTransition();
  const [statuses, setStatuses] = useState<
    Record<string, { status: Status; note?: string }>
  >({});

  const setStatus = (id: string, status: Status, note?: string) => {
    setStatuses((s) => ({ ...s, [id]: { status, note } }));
  };

  /**
   * Resolve photo URLs for one place using the JS SDK. Falls back to
   * findPlaceFromQuery when the stored place_id is the bad list-scrape ID
   * (Places API returns INVALID_REQUEST on those).
   */
  const fetchPhotoUrls = (item: Item): Promise<string[]> =>
    new Promise((resolve) => {
      if (!window.google?.maps?.places) return resolve([]);
      const svc = new google.maps.places.PlacesService(
        document.createElement("div")
      );

      const tryDetails = (placeId: string) =>
        new Promise<google.maps.places.PlaceResult | null>((res) => {
          svc.getDetails(
            { placeId, fields: ["photos"] },
            (r, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && r) {
                res(r);
              } else {
                res(null);
              }
            }
          );
        });

      const tryFindRealId = () =>
        new Promise<string | null>((res) => {
          svc.findPlaceFromQuery(
            {
              query: item.name,
              fields: ["place_id"],
              locationBias: new google.maps.Circle({
                center: { lat: item.lat, lng: item.lng },
                radius: 200,
              }),
            },
            (results, status) => {
              if (
                status === google.maps.places.PlacesServiceStatus.OK &&
                results &&
                results[0]?.place_id
              ) {
                res(results[0].place_id);
              } else {
                res(null);
              }
            }
          );
        });

      (async () => {
        let result: google.maps.places.PlaceResult | null = item.google_place_id
          ? await tryDetails(item.google_place_id)
          : null;
        if (!result) {
          const realId = await tryFindRealId();
          if (realId) result = await tryDetails(realId);
        }
        if (!result?.photos || result.photos.length === 0) return resolve([]);
        const urls = result.photos
          .slice(0, 3)
          .map((ph) => {
            try {
              return ph.getUrl({ maxWidth: 1600 });
            } catch {
              return null;
            }
          })
          .filter((u): u is string => typeof u === "string" && u.length > 0);
        resolve(urls);
      })();
    });

  const runOne = async (
    item: Item,
    kind: "city" | "location"
  ): Promise<void> => {
    setStatus(item.id, "fetching");
    const urls = await fetchPhotoUrls(item);
    if (urls.length === 0) {
      setStatus(item.id, "skipped", "google'da foto bulamadım");
      return;
    }
    const r =
      kind === "city"
        ? await backfillCityPhotosFromUrls(item.id, urls)
        : await backfillLocationPhotosFromUrls(item.id, urls);
    if (!r.ok) {
      setStatus(item.id, "error", r.error);
    } else {
      setStatus(item.id, "done", `+${r.inserted} foto`);
    }
  };

  const runAll = () => {
    if (running || !isLoaded) return;
    setRunning(true);
    startTransition(async () => {
      // serial — Google JS SDK doesn't love parallel hammering
      for (const c of cities) {
        await runOne(c, "city");
      }
      for (const l of locations) {
        await runOne(l, "location");
      }
      setRunning(false);
    });
  };

  const totalDone = Object.values(statuses).filter(
    (s) => s.status === "done"
  ).length;
  const totalSkipped = Object.values(statuses).filter(
    (s) => s.status === "skipped" || s.status === "error"
  ).length;
  const total = cities.length + locations.length;

  const router = useRouter();
  const [serverResult, setServerResult] = useState<string | null>(null);
  const [serverPending, startServerTx] = useTransition();
  const runServerBackfill = () => {
    setServerResult(null);
    startServerTx(async () => {
      const cityR = await backfillAllCitiesFromGoogle();
      const locR = await backfillAllLocationsFromGoogle();
      if (!cityR.ok && !locR.ok) {
        setServerResult(
          `hata: ${cityR.error ?? locR.error ?? "bilinmeyen"} — Vercel'de GOOGLE_PLACES_API_KEY env var ekledin mi?`
        );
        return;
      }
      const parts: string[] = [];
      if (cityR.ok) {
        parts.push(`${cityR.done}/${cityR.total} şehir (+${cityR.added} foto)`);
      }
      if (locR.ok) {
        parts.push(`${locR.done}/${locR.total} yer (+${locR.added} foto)`);
      }
      setServerResult(parts.join(" · ") || "iş yok");
      router.refresh();
    });
  };

  if (total === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div
          className="text-center py-10 px-6"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--ink)",
            borderRadius: "20px",
            boxShadow: "var(--shadow-pop)",
          }}
        >
          <div className="text-[3rem] mb-3">✨</div>
          <p
            className="text-[1rem] font-semibold"
            style={{ color: "var(--ink)" }}
          >
            her yerin fotoğrafı tamam, {memberName.toLowerCase()}!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={runServerBackfill}
          disabled={serverPending}
          className="btn-primary w-full justify-center"
          style={{
            padding: "0.95rem 1.25rem",
            background: "var(--accent-2)",
          }}
        >
          {serverPending
            ? "google'dan çekiyorum..."
            : "google'dan hepsini çek (server)"}
        </button>
        {serverResult && (
          <p
            className="text-[0.85rem] text-center"
            style={{ color: "var(--text-muted)" }}
          >
            {serverResult}
          </p>
        )}
        <p
          className="text-[0.78rem] text-center"
          style={{ color: "var(--text-dim)" }}
        >
          önce Vercel&apos;e GOOGLE_PLACES_API_KEY env var ekle (referer
          kısıtlaması olmayan ayrı bir Places API key)
        </p>
      </div>

      <button
        type="button"
        onClick={runAll}
        disabled={running || pending || !isLoaded}
        className="btn-primary w-full justify-center"
        style={{ padding: "0.95rem 1.25rem" }}
      >
        {!isLoaded
          ? "google yükleniyor..."
          : running || pending
          ? `çekiyorum... ${totalDone + totalSkipped}/${total}`
          : `${total} yerin fotosunu google'dan çek`}
      </button>

      <div className="flex flex-col gap-2">
        {cities.map((c) => (
          <Row key={`c-${c.id}`} label={`şehir · ${c.name}`} status={statuses[c.id]} />
        ))}
        {locations.map((l) => (
          <Row key={`l-${l.id}`} label={`yer · ${l.name}`} status={statuses[l.id]} />
        ))}
      </div>
    </div>
  );
}

function Row({
  label,
  status,
}: {
  label: string;
  status?: { status: Status; note?: string };
}) {
  const s = status?.status ?? "pending";
  const tone =
    s === "done"
      ? "var(--accent-2-soft)"
      : s === "fetching"
      ? "var(--accent-3-soft)"
      : s === "error"
      ? "var(--danger-soft)"
      : "var(--surface)";
  const icon =
    s === "done"
      ? "✓"
      : s === "fetching"
      ? "…"
      : s === "skipped"
      ? "—"
      : s === "error"
      ? "!"
      : "·";
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 text-[0.88rem]"
      style={{
        background: tone,
        border: "2px solid var(--ink)",
        borderRadius: "12px",
      }}
    >
      <span
        className="flex items-center justify-center font-bold"
        style={{
          width: 22,
          height: 22,
          background: "var(--bg)",
          border: "1.5px solid var(--ink)",
          borderRadius: 999,
          color: "var(--ink)",
          fontSize: "0.78rem",
        }}
      >
        {icon}
      </span>
      <span className="flex-1 truncate" style={{ color: "var(--ink)" }}>
        {label}
      </span>
      {status?.note && (
        <span
          className="text-[0.78rem]"
          style={{ color: "var(--text-muted)" }}
        >
          {status.note}
        </span>
      )}
    </div>
  );
}
