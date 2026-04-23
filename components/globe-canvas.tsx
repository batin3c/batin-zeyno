"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";
import Globe from "react-globe.gl";
import { MeshPhongMaterial, Color } from "three";
import type { Feature, Geometry } from "geojson";
import { loadCountryFeatures, type CountryFeatureProps } from "@/lib/countries";

type CF = Feature<Geometry, CountryFeatureProps>;

type AnyPolyProps = CountryFeatureProps | { kind: "city-boundary"; id: string };
type AnyPoly = Feature<Geometry, AnyPolyProps>;

export type CityPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

export type CityBoundary = {
  id: string;
  geometry: Geometry;
};

const OCEAN = "#a8d8e8";
const BORDER = "#1f1a14";
const FILL_UNVISITED = "rgba(255, 247, 232, 0.92)";
const FILL_VISITED = "rgba(255, 107, 157, 0.92)";
const SIDE_COLOR = "rgba(31, 26, 20, 0.25)";
const CITY_COLOR = "#5dc9b1";
const IDLE_TIMEOUT_MS = 4000;
const AUTO_ROTATE_SPEED = 0.35;

export function GlobeCanvas({
  visitedCodes,
  cities,
  selectedCityBoundary,
  onSelectCountry,
  onSelectCity,
}: {
  visitedCodes: Set<string>;
  cities: CityPoint[];
  selectedCityBoundary: CityBoundary | null;
  onSelectCountry: (code: string) => void;
  onSelectCity: (id: string) => void;
}) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const features = useMemo(() => loadCountryFeatures().features as CF[], []);
  const oceanMaterial = useMemo(
    () =>
      new MeshPhongMaterial({
        color: new Color(OCEAN),
        shininess: 0,
        flatShading: false,
      }),
    []
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.floor(r.width), h: Math.floor(r.height) });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setSize({ w: Math.floor(r.width), h: Math.floor(r.height) });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const g = globeRef.current;
    if (!g || size.w === 0) return;

    g.pointOfView({ lat: 39, lng: 35, altitude: 2.2 }, 0);

    const controls = g.controls() as unknown as {
      autoRotate: boolean;
      autoRotateSpeed: number;
      enableZoom: boolean;
      rotateSpeed: number;
      minDistance: number;
      maxDistance: number;
      enablePan: boolean;
      minPolarAngle: number;
      maxPolarAngle: number;
    };
    controls.autoRotate = true;
    controls.autoRotateSpeed = AUTO_ROTATE_SPEED;
    controls.enableZoom = true;
    controls.rotateSpeed = 0.8;
    controls.minDistance = 180;
    controls.maxDistance = 600;
    controls.enablePan = false;
    controls.minPolarAngle = Math.PI / 4;
    controls.maxPolarAngle = (3 * Math.PI) / 4;

    const el = containerRef.current;
    if (!el) return;

    const stopRotate = () => {
      controls.autoRotate = false;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
    const scheduleResume = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        controls.autoRotate = true;
      }, IDLE_TIMEOUT_MS);
    };

    const onDown = () => stopRotate();
    const onUp = () => scheduleResume();
    const onWheel = () => {
      stopRotate();
      scheduleResume();
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [size.w]);

  const handleCountryClick = (f: object) => {
    if (isCityBoundary(f)) return;
    const feat = f as CF;
    const iso2 = feat.properties?.iso2;
    if (!iso2) return;
    const g = globeRef.current;
    if (g) {
      const [lng, lat] = centroid(feat);
      g.pointOfView({ lat, lng, altitude: 1.8 }, 800);
    }
    onSelectCountry(iso2);
  };

  const handlePointClick = (p: object) => {
    const city = p as CityPoint;
    if (!city?.id) return;
    const g = globeRef.current;
    if (g) {
      g.pointOfView({ lat: city.lat, lng: city.lng, altitude: 1.4 }, 800);
    }
    onSelectCity(city.id);
  };

  const polygons = useMemo(() => {
    const base = features as unknown as AnyPoly[];
    if (!selectedCityBoundary) return base;
    const boundaryFeature: AnyPoly = {
      type: "Feature",
      geometry: selectedCityBoundary.geometry,
      properties: { kind: "city-boundary", id: selectedCityBoundary.id },
    };
    return [...base, boundaryFeature];
  }, [features, selectedCityBoundary]);

  const isCityBoundary = (f: object): boolean => {
    const feat = f as AnyPoly;
    return (
      typeof feat.properties === "object" &&
      feat.properties !== null &&
      "kind" in feat.properties &&
      feat.properties.kind === "city-boundary"
    );
  };

  const polygonCapColor = (f: object) => {
    if (isCityBoundary(f)) return "rgba(255, 107, 157, 0.78)";
    const feat = f as CF;
    return visitedCodes.has(feat.properties?.iso2 ?? "")
      ? FILL_VISITED
      : FILL_UNVISITED;
  };

  const polygonSideColor = (f: object) =>
    isCityBoundary(f) ? "rgba(31, 26, 20, 0.4)" : SIDE_COLOR;

  const polygonStrokeColor = () => BORDER;

  const polygonAltitude = (f: object) => {
    if (isCityBoundary(f)) return 0.028;
    const feat = f as CF;
    return visitedCodes.has(feat.properties?.iso2 ?? "") ? 0.022 : 0.008;
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "calc(100dvh - 64px)",
        touchAction: "none",
        cursor: "grab",
      }}
    >
      {size.w > 0 && (
        <Globe
          ref={globeRef}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={oceanMaterial}
          showAtmosphere={false}
          showGraticules={false}
          polygonsData={polygons as unknown as object[]}
          polygonCapColor={polygonCapColor}
          polygonSideColor={polygonSideColor}
          polygonStrokeColor={polygonStrokeColor}
          polygonAltitude={polygonAltitude}
          polygonsTransitionDuration={220}
          onPolygonClick={handleCountryClick}
          pointsData={cities as unknown as object[]}
          pointLat="lat"
          pointLng="lng"
          pointColor={() => CITY_COLOR}
          pointAltitude={0.035}
          pointRadius={0.32}
          pointResolution={12}
          pointLabel={(p: object) => {
            const c = p as CityPoint;
            return `<div style="background:#1f1a14;color:#fbf7ee;padding:4px 9px;border-radius:999px;font-family:Fredoka,sans-serif;font-weight:600;font-size:12px;">📍 ${escapeHtml(c.name)}</div>`;
          }}
          onPointClick={handlePointClick}
        />
      )}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function centroid(f: CF): [number, number] {
  const g = f.geometry;
  let lngSum = 0;
  let latSum = 0;
  let n = 0;
  const collect = (rings: number[][][]) => {
    for (const ring of rings) {
      for (const [lng, lat] of ring) {
        lngSum += lng;
        latSum += lat;
        n++;
      }
    }
  };
  if (g.type === "Polygon") {
    collect(g.coordinates);
  } else if (g.type === "MultiPolygon") {
    for (const poly of g.coordinates) collect(poly);
  }
  if (n === 0) return [0, 0];
  return [lngSum / n, latSum / n];
}
