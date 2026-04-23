"use client";

import { useMemo, useState } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import type { Location, Member } from "@/lib/types";
import { directionsUrl, openInMapsUrl } from "@/lib/google-maps";
import { CATEGORIES } from "@/lib/types";

type Libraries = ("places" | "geocoding")[];
const LIBRARIES: Libraries = ["places"];

// very quiet, near-monochrome with our accent for water
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f0ebe0" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6a615a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f0e6" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#d8ceb7" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#ebe2cd" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#e4d9c0" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#e0d5bd" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#c8c9a0" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#fbf7ef" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e0d5bd" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#ede2c9" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#d4c8ad" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#d8ceb7" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#a5bcbf" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4f6366" }] },
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
        backgroundColor: "#f5f0e6",
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
    path: "M0,0 m -11,0 a 11,11 0 1,0 22,0 a 11,11 0 1,0 -22,0",
    fillColor: "#8c5e2e",
    fillOpacity: 1,
    strokeColor: "#fbf7ef",
    strokeWeight: 2,
    scale: 1.5,
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
        color: "#1a1714",
        fontFamily: "'Bricolage Grotesque', sans-serif",
        padding: "2px",
      }}
    >
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "#7a7166",
          marginBottom: 5,
        }}
      >
        {cat?.label ?? "yer"} · {loc.status === "visited" ? "gittik" : "gidilecek"}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          lineHeight: 1.15,
          marginBottom: 4,
        }}
      >
        {cat?.emoji} {loc.name}
      </div>
      {loc.address && (
        <div
          style={{
            fontSize: 12,
            color: "#7a7166",
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
            color: "#5a5248",
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
            color: "#a8a093",
            marginBottom: 10,
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
            fontSize: 12,
            fontWeight: 500,
            padding: "7px 12px",
            background: "#8c5e2e",
            color: "#fbf7ef",
            textDecoration: "none",
            border: "none",
            borderRadius: 8,
          }}
        >
          yol tarifi
        </a>
        <a
          href={openInMapsUrl(loc.lat, loc.lng, loc.google_place_id, loc.name)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 12,
            fontWeight: 500,
            padding: "7px 12px",
            background: "transparent",
            color: "#1a1714",
            textDecoration: "none",
            border: "1px solid #e0d5bd",
            borderRadius: 8,
          }}
        >
          haritalar
        </a>
      </div>
    </div>
  );
}
