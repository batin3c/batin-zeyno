"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export type RouteArc = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
};

const IDLE_TIMEOUT_MS = 4000;
const AUTO_ROTATE_SPEED = 0.35;

function readVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

function useThemeColors() {
  const [palette, setPalette] = useState(() => ({
    ocean: "#a8d8e8",
    border: "#1f1a14",
    landUnvisited: "rgba(255, 247, 232, 0.92)",
    landVisited: "rgba(255, 107, 157, 0.92)",
    side: "rgba(31, 26, 20, 0.25)",
    city: "#5dc9b1",
    arc: "rgba(31, 26, 20, 0.55)",
    cityHaloCap: "rgba(93, 201, 177, 0.9)",
    cityHaloSide: "rgba(93, 201, 177, 0.6)",
  }));

  useEffect(() => {
    const refresh = () => {
      setPalette({
        ocean: readVar("--globe-ocean", "#a8d8e8"),
        border: readVar("--globe-border", "#1f1a14"),
        landUnvisited: readVar("--globe-land-unvisited", "#fff7e8"),
        landVisited: readVar("--globe-land-visited", "#ff6b9d"),
        side:
          document.documentElement.getAttribute("data-theme") === "dark"
            ? "rgba(251, 247, 238, 0.18)"
            : "rgba(31, 26, 20, 0.25)",
        city: readVar("--accent-2", "#5dc9b1"),
        arc:
          document.documentElement.getAttribute("data-theme") === "dark"
            ? "rgba(251, 247, 238, 0.35)"
            : "rgba(31, 26, 20, 0.55)",
        cityHaloCap: "rgba(93, 201, 177, 0.9)",
        cityHaloSide: "rgba(93, 201, 177, 0.6)",
      });
    };
    refresh();
    const obs = new MutationObserver(refresh);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);

  return palette;
}

export function GlobeCanvas({
  visitedCodes,
  cities,
  selectedCityBoundary,
  selectedCityId,
  routes,
  onSelectCountry,
  onSelectCity,
}: {
  visitedCodes: Set<string>;
  cities: CityPoint[];
  selectedCityBoundary: CityBoundary | null;
  selectedCityId: string | null;
  routes: RouteArc[];
  onSelectCountry: (code: string) => void;
  onSelectCity: (id: string) => void;
}) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const features = useMemo(() => loadCountryFeatures().features as CF[], []);
  const palette = useThemeColors();
  const oceanMaterial = useMemo(
    () =>
      new MeshPhongMaterial({
        color: new Color(palette.ocean),
        shininess: 0,
        flatShading: false,
      }),
    [palette.ocean]
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

  const handleCountryClick = useCallback(
    (f: object) => {
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
    },
    [onSelectCountry]
  );

  const handlePointClick = useCallback(
    (p: object) => {
      const city = p as CityPoint;
      if (!city?.id) return;
      const g = globeRef.current;
      if (g) {
        g.pointOfView({ lat: city.lat, lng: city.lng, altitude: 1.4 }, 800);
      }
      onSelectCity(city.id);
    },
    [onSelectCity]
  );

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

  const polygonCapColor = useCallback(
    (f: object) => {
      if (isCityBoundary(f)) return palette.cityHaloCap;
      const feat = f as CF;
      return visitedCodes.has(feat.properties?.iso2 ?? "")
        ? palette.landVisited
        : palette.landUnvisited;
    },
    [visitedCodes, palette]
  );

  const polygonSideColor = useCallback(
    (f: object) =>
      isCityBoundary(f) ? palette.cityHaloSide : palette.side,
    [palette]
  );

  const polygonStrokeColor = useCallback(() => palette.border, [palette.border]);

  const polygonAltitude = useCallback(
    (f: object) => {
      if (isCityBoundary(f)) return 0.06;
      const feat = f as CF;
      return visitedCodes.has(feat.properties?.iso2 ?? "") ? 0.004 : 0.002;
    },
    [visitedCodes]
  );

  const pointAltitude = useCallback(
    (p: object) => {
      const c = p as CityPoint;
      return selectedCityId === c.id ? 0 : 0.018;
    },
    [selectedCityId]
  );

  const pointColor = useCallback(() => palette.city, [palette.city]);

  const arcColor = useCallback(() => palette.arc, [palette.arc]);

  const pointLabel = useCallback(
    (p: object) => {
      const c = p as CityPoint;
      const fg = palette.border === "#fbf7ee" || palette.border === "#FBF7EE"
        ? "#1f1a14"
        : "#fbf7ee";
      return `<div style="background:${palette.border};color:${fg};padding:4px 9px;border-radius:999px;font-family:Fredoka,sans-serif;font-weight:600;font-size:12px;">📍 ${escapeHtml(c.name)}</div>`;
    },
    [palette.border]
  );

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
          polygonsTransitionDuration={0}
          onPolygonClick={handleCountryClick}
          pointsData={cities as unknown as object[]}
          pointLat="lat"
          pointLng="lng"
          pointColor={pointColor}
          pointAltitude={pointAltitude}
          pointRadius={0.55}
          pointResolution={12}
          pointLabel={pointLabel}
          onPointClick={handlePointClick}
          arcsData={routes as unknown as object[]}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor={arcColor}
          arcAltitudeAutoScale={0.35}
          arcStroke={0.35}
          arcDashLength={0.45}
          arcDashGap={0.25}
          arcDashAnimateTime={2600}
        />
      )}
    </div>
  );
}

function isCityBoundary(f: object): boolean {
  const feat = f as AnyPoly;
  return (
    typeof feat.properties === "object" &&
    feat.properties !== null &&
    "kind" in feat.properties &&
    feat.properties.kind === "city-boundary"
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
