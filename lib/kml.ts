import { XMLParser } from "fast-xml-parser";

export type KmlPlacemark = {
  name: string;
  lat: number;
  lng: number;
  description?: string;
};

export function parseKml(xml: string): KmlPlacemark[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseAttributeValue: false,
    parseTagValue: false,
    trimValues: true,
    cdataPropName: "__cdata",
  });

  let obj: unknown;
  try {
    obj = parser.parse(xml);
  } catch {
    return [];
  }

  const out: KmlPlacemark[] = [];
  collect(obj, out);
  return out;
}

function collect(node: unknown, out: KmlPlacemark[]) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) collect(item, out);
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Record<string, unknown>;

  const pm = extract(obj);
  if (pm) out.push(pm);

  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") collect(v, out);
  }
}

function asText(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (v && typeof v === "object") {
    const cdata = (v as Record<string, unknown>).__cdata;
    if (typeof cdata === "string") return cdata.trim();
    const hash = (v as Record<string, unknown>)["#text"];
    if (typeof hash === "string") return hash.trim();
  }
  return "";
}

function extract(obj: Record<string, unknown>): KmlPlacemark | null {
  const point = obj.Point as Record<string, unknown> | undefined;
  if (!point) return null;

  const coordsText = asText(point.coordinates);
  if (!coordsText) return null;

  // coordinates can be "lng,lat[,alt]"; takeout sometimes includes trailing whitespace
  const first = coordsText.split(/\s+/)[0] ?? coordsText;
  const parts = first.split(",");
  if (parts.length < 2) return null;
  const lng = parseFloat(parts[0]);
  const lat = parseFloat(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const name = asText(obj.name) || "Yer";
  const description = asText(obj.description) || undefined;
  return { name, lat, lng, description };
}
