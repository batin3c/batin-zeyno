"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";
import Globe from "react-globe.gl";
import { MeshPhongMaterial, Color } from "three";
import type { Feature, Geometry } from "geojson";
import { loadCountryFeatures, type CountryFeatureProps } from "@/lib/countries";

type CF = Feature<Geometry, CountryFeatureProps>;

const OCEAN = "#a8d8e8";
const BORDER = "#1f1a14";
const FILL_UNVISITED = "rgba(255, 247, 232, 0.92)";
const FILL_VISITED = "rgba(255, 107, 157, 0.92)";
const SIDE_COLOR = "rgba(31, 26, 20, 0.25)";
const IDLE_TIMEOUT_MS = 4000;
const AUTO_ROTATE_SPEED = 0.35;

export function GlobeCanvas({
  visitedCodes,
  onSelect,
}: {
  visitedCodes: Set<string>;
  onSelect: (code: string) => void;
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

  // observe container size
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

  // initial camera + controls config + idle auto-rotate wiring
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
    };
    controls.autoRotate = true;
    controls.autoRotateSpeed = AUTO_ROTATE_SPEED;
    controls.enableZoom = true;
    controls.rotateSpeed = 0.8;
    controls.minDistance = 180;
    controls.maxDistance = 600;
    controls.enablePan = false;

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

  const handleClick = (f: object) => {
    const feat = f as CF;
    const iso2 = feat.properties?.iso2;
    if (!iso2) return;
    const g = globeRef.current;
    if (g) {
      const [lng, lat] = centroid(feat);
      g.pointOfView({ lat, lng, altitude: 1.8 }, 800);
    }
    onSelect(iso2);
  };

  const polygonCapColor = (f: object) => {
    const feat = f as CF;
    return visitedCodes.has(feat.properties?.iso2 ?? "")
      ? FILL_VISITED
      : FILL_UNVISITED;
  };

  const polygonSideColor = () => SIDE_COLOR;
  const polygonStrokeColor = () => BORDER;

  const polygonAltitude = (f: object) => {
    const feat = f as CF;
    return visitedCodes.has(feat.properties?.iso2 ?? "") ? 0.022 : 0.008;
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "calc(100dvh - 56px)",
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
          polygonsData={features as unknown as object[]}
          polygonCapColor={polygonCapColor}
          polygonSideColor={polygonSideColor}
          polygonStrokeColor={polygonStrokeColor}
          polygonAltitude={polygonAltitude}
          polygonsTransitionDuration={220}
          onPolygonClick={handleClick}
        />
      )}
    </div>
  );
}

// crude centroid from GeoJSON geometry (MultiPolygon or Polygon)
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
