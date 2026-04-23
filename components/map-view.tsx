"use client";

import { useMemo, useState } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import type { Location, Member } from "@/lib/types";
import { CATEGORY_COLOR, directionsUrl, openInMapsUrl } from "@/lib/google-maps";
import { CATEGORIES } from "@/lib/types";

type Libraries = ("places" | "geocoding")[];
const LIBRARIES: Libraries = ["places"];

// muted journal-style map (applied via options.styles)
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#ede4cf" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5a5246" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ede4cf" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#b6a486" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#e5dbc1" }],
  },
  {
    featureType: "landscape.natural",
    elementType: "geometry",
    stylers: [{ color: "#d7cdb2" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#e0d5b9" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#c6c79a" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#f4ebd4" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#d6c8a8" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#e9dcb9" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#d6c8a8" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#9db5bf" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#2d5e6e" }],
  },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
];

export function MapView({
  locations,
  members,
  onAddAt,
}: {
  locations: Location[];
  members: Member[];
  onAddAt?: (lat: number, lng: number) => void;
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: LIBRARIES,
    language: "tr",
  });
  const [selected, setSelected] = useState<Location | null>(null);

  const center = useMemo(() => {
    if (locations.length === 0) return { lat: 41.0082, lng: 28.9784 };
    const avg = locations.reduce(
      (acc, l) => ({ lat: acc.lat + l.lat, lng: acc.lng + l.lng }),
      { lat: 0, lng: 0 }
    );
    return { lat: avg.lat / locations.length, lng: avg.lng / locations.length };
  }, [locations]);

  const membersById = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m])),
    [members]
  );

  if (loadError) {
    return (
      <div className="p-6 text-sm text-center font-serif italic text-[color:var(--ink-soft)]">
        harita yüklenemedi. api anahtarı?
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div className="p-6 text-sm text-center label-mono">harita yükleniyor…</div>
    );
  }

  return (
    <GoogleMap
      mapContainerClassName="w-full h-full"
      center={center}
      zoom={locations.length === 0 ? 6 : 12}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
        styles: MAP_STYLES,
        backgroundColor: "#ede4cf",
      }}
      onClick={(e) => {
        if (!onAddAt) return;
        const lat = e.latLng?.lat();
        const lng = e.latLng?.lng();
        if (lat != null && lng != null) onAddAt(lat, lng);
      }}
    >
      {locations.map((loc) => (
        <Marker
          key={loc.id}
          position={{ lat: loc.lat, lng: loc.lng }}
          onClick={() => setSelected(loc)}
          icon={buildPinIcon(CATEGORY_COLOR[loc.category])}
          label={{
            text: emojiFor(loc.category),
            fontSize: "14px",
          }}
        />
      ))}

      {selected && (
        <InfoWindow
          position={{ lat: selected.lat, lng: selected.lng }}
          onCloseClick={() => setSelected(null)}
        >
          <InfoContent
            loc={selected}
            addedBy={selected.added_by ? membersById[selected.added_by] : null}
          />
        </InfoWindow>
      )}
    </GoogleMap>
  );
}

function buildPinIcon(color: string): google.maps.Symbol {
  return {
    path: "M12 2C7.6 2 4 5.6 4 10c0 5.8 7 11.5 7.3 11.7.2.2.6.2.8 0C12.4 21.5 20 15.8 20 10c0-4.4-3.6-8-8-8z",
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#1c1814",
    strokeWeight: 1.5,
    scale: 1.9,
    anchor: new google.maps.Point(12, 22),
    labelOrigin: new google.maps.Point(12, 9),
  };
}

function emojiFor(cat: string) {
  return CATEGORIES.find((c) => c.key === cat)?.emoji ?? "📍";
}

function InfoContent({
  loc,
  addedBy,
}: {
  loc: Location;
  addedBy: Member | null;
}) {
  const cat = CATEGORIES.find((c) => c.key === loc.category);
  return (
    <div
      style={{
        minWidth: 220,
        maxWidth: 260,
        color: "#1c1814",
        fontFamily: "'DM Sans', sans-serif",
        padding: "2px",
      }}
    >
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 9,
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          color: "#5a5246",
          marginBottom: 4,
        }}
      >
        {cat?.label ?? "yer"} · {loc.status === "visited" ? "gittik" : "gidilecek"}
      </div>
      <div
        style={{
          fontFamily: "'Fraunces', serif",
          fontStyle: "italic",
          fontSize: 18,
          lineHeight: 1.1,
          marginBottom: 4,
        }}
      >
        {cat?.emoji} {loc.name}
      </div>
      {loc.address && (
        <div
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: "#5a5246",
            marginBottom: 6,
          }}
        >
          {loc.address}
        </div>
      )}
      {loc.note && (
        <div
          style={{
            fontFamily: "'Fraunces', serif",
            fontStyle: "italic",
            fontSize: 13,
            marginBottom: 8,
            color: "#5a5246",
          }}
        >
          &ldquo;{loc.note}&rdquo;
        </div>
      )}
      {addedBy && (
        <div
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: "#5a5246",
            marginBottom: 10,
            opacity: 0.75,
          }}
        >
          · {addedBy.name.toLowerCase()} ekledi
        </div>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <a
          href={directionsUrl(loc.lat, loc.lng, loc.name)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            padding: "6px 10px",
            background: "#c23836",
            color: "#ede4cf",
            textDecoration: "none",
            border: "none",
          }}
        >
          yol tarifi
        </a>
        <a
          href={openInMapsUrl(loc.lat, loc.lng, loc.google_place_id, loc.name)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            padding: "6px 10px",
            background: "transparent",
            color: "#5a5246",
            textDecoration: "none",
            border: "1px dashed #b6a486",
          }}
        >
          haritalar
        </a>
      </div>
    </div>
  );
}
