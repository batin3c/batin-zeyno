"use client";

import { useMemo, useState } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import type { Location, Member } from "@/lib/types";
import { directionsUrl, openInMapsUrl } from "@/lib/google-maps";
import { CATEGORIES } from "@/lib/types";

type Libraries = ("places" | "geocoding")[];
const LIBRARIES: Libraries = ["places"];

// toony pastel map — cream land, pastel sky water, soft roads
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#fff4e6" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#3b342a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#1f1a14" }, { weight: 1 }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#fff7e8" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#fff4e6" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#ffe8b5" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#c8ece2" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e0d5bd" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#ffe8b5" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f1a14" }, { weight: 0.5 }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#e5dbf5" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#a8d8e8" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3b342a" }] },
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
      <div
        className="p-6 text-sm text-center"
        style={{ color: "var(--text-muted)" }}
      >
harita gelmedi aq.
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div
        className="p-6 text-sm text-center"
        style={{ color: "var(--text-dim)" }}
      >
        harita yükleniyor…
      </div>
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
        backgroundColor: "#fbf7ee",
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
          icon={buildPinIcon()}
          label={{
            text: emojiFor(loc.category),
            fontSize: "13px",
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

function buildPinIcon(): google.maps.Symbol {
  return {
    path: "M0,0 m -12,0 a 12,12 0 1,0 24,0 a 12,12 0 1,0 -24,0",
    fillColor: "#ff6b9d",
    fillOpacity: 1,
    strokeColor: "#1f1a14",
    strokeWeight: 2.5,
    scale: 1.6,
    anchor: new google.maps.Point(0, 0),
    labelOrigin: new google.maps.Point(0, 0),
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
        color: "#1f1a14",
        fontFamily: "'Fredoka', sans-serif",
        padding: "2px",
      }}
    >
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "#6b6355",
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        {cat?.label ?? "yer"} · {loc.status === "visited" ? "gittik" : "gidilecek"}
      </div>
      <div
        style={{
          fontSize: 17,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          lineHeight: 1.2,
          marginBottom: 6,
        }}
      >
        {cat?.emoji} {loc.name}
      </div>
      {loc.address && (
        <div
          style={{
            fontSize: 12,
            color: "#6b6355",
            marginBottom: 8,
            lineHeight: 1.4,
          }}
        >
          {loc.address}
        </div>
      )}
      {loc.note && (
        <div
          style={{
            fontSize: 13,
            marginBottom: 8,
            color: "#3b342a",
            lineHeight: 1.45,
          }}
        >
          {loc.note}
        </div>
      )}
      {addedBy && (
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "#a89f8f",
            marginBottom: 10,
            fontWeight: 600,
          }}
        >
          {addedBy.name.toLowerCase()} attı
        </div>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <a
          href={directionsUrl(loc.lat, loc.lng, loc.name)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 13,
            fontWeight: 600,
            padding: "6px 12px",
            background: "#ff6b9d",
            color: "#1f1a14",
            textDecoration: "none",
            border: "2px solid #1f1a14",
            borderRadius: 12,
            boxShadow: "2px 2px 0 #1f1a14",
          }}
        >
          yol tarifi
        </a>
        <a
          href={openInMapsUrl(loc.lat, loc.lng, loc.google_place_id, loc.name)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 13,
            fontWeight: 600,
            padding: "6px 12px",
            background: "#ffffff",
            color: "#1f1a14",
            textDecoration: "none",
            border: "2px solid #1f1a14",
            borderRadius: 12,
            boxShadow: "2px 2px 0 #1f1a14",
          }}
        >
          haritalar
        </a>
      </div>
    </div>
  );
}
