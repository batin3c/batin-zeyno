// OSM Nominatim admin boundary fetcher
// Policy: max 1 req/sec, proper UA required
// https://operations.osmfoundation.org/policies/nominatim/

const UA = "baze/1.0 (https://baze-tau.vercel.app)";

export type GeoJsonGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export async function fetchCityBoundary(
  name: string,
  countryCode: string | null
): Promise<GeoJsonGeometry | null> {
  const q = encodeURIComponent(
    countryCode ? `${name}, ${countryCode}` : name
  );
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&polygon_geojson=1&limit=1&accept-language=tr`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "accept-language": "tr,en" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ geojson?: unknown }>;
    const geo = data[0]?.geojson as GeoJsonGeometry | undefined;
    if (!geo) return null;
    // only accept polygonal geometries
    if (geo.type !== "Polygon" && geo.type !== "MultiPolygon") return null;
    return geo;
  } catch {
    return null;
  }
}
