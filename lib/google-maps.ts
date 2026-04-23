import type { Category } from "./types";

// color for marker per category
export const CATEGORY_COLOR: Record<Category, string> = {
  restaurant: "#e85d75",
  cafe: "#a67c52",
  bar: "#8b3a62",
  hotel: "#4c6ef5",
  museum: "#7048e8",
  view: "#12b886",
  shopping: "#f59f00",
  nature: "#37b24d",
  activity: "#f76707",
  other: "#495057",
};

export function directionsUrl(lat: number, lng: number, label?: string) {
  const dest = label
    ? encodeURIComponent(label)
    : `${lat},${lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&destination_place_id=&travelmode=driving`;
}

export function openInMapsUrl(
  lat: number,
  lng: number,
  placeId?: string | null,
  name?: string | null
) {
  if (placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      name ?? ""
    )}&query_place_id=${placeId}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

// resolve a Google Maps share URL (like https://maps.app.goo.gl/XXX) by
// following redirects and extracting coordinates from the expanded URL.
// returns null if we cannot resolve. no API cost — just HTTP follow.
export async function resolveMapsShareUrl(
  shareUrl: string
): Promise<{ lat: number; lng: number; name?: string } | null> {
  try {
    const res = await fetch(shareUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      },
    });
    const finalUrl = res.url;
    return parseMapsUrl(finalUrl);
  } catch {
    return null;
  }
}

export function parseMapsUrl(
  url: string
): { lat: number; lng: number; name?: string } | null {
  // pattern 1: /@lat,lng,zoom
  const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  // pattern 2: !3dlat!4dlng (embedded coords)
  const embed = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  // pattern 3: query=lat,lng
  const query = url.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);

  const m = embed ?? at ?? query;
  if (!m) return null;

  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  // try to extract place name: /place/NAME/@...
  const place = url.match(/\/place\/([^/@]+)/);
  const name = place ? decodeURIComponent(place[1].replace(/\+/g, " ")) : undefined;

  return { lat, lng, name };
}
