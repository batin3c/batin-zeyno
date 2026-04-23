const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export type GoogleListPlace = {
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  google_place_id: string | null;
  feature_id: string | null;
};

export type GoogleListResult = {
  title: string | null;
  places: GoogleListPlace[];
};

function extractListId(urlOrHtml: string): string | null {
  // canonical: https://www.google.com/maps/placelists/list/<id>
  let m = urlOrHtml.match(/\/placelists\/list\/([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  // /maps/@/data=!3m1!4b1!4m2!11m1!2s<id>
  m = urlOrHtml.match(/!11m1!2s([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  // getlist pb param: %211m1%211s<id>%21 (URL-encoded) or !1m1!1s<id>!
  m = urlOrHtml.match(/%211m1%211s([A-Za-z0-9_-]+)%21/);
  if (m) return m[1];
  m = urlOrHtml.match(/!1m1!1s([A-Za-z0-9_-]+)!/);
  if (m) return m[1];
  return null;
}

async function followShort(url: string): Promise<string> {
  // maps.app.goo.gl short link -> maps.google.com URL
  // HEAD follows redirects; fetch in Node with manual redirect handling.
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: { "user-agent": UA },
  });
  return res.url;
}

async function fetchListHtml(pageUrl: string): Promise<string> {
  const res = await fetch(pageUrl, {
    headers: { "user-agent": UA, "accept-language": "tr-TR,tr;q=0.9" },
  });
  if (!res.ok) throw new Error(`list page ${res.status}`);
  return res.text();
}

function extractGetlistUrl(html: string, listId: string): string | null {
  // <link rel="preload" href="/maps/preview/entitylist/getlist?...&pb=!1m1!1s<listId>..." as="fetch">
  // or <link ... href="/maps/preview/entitylist/getlist?..."
  const re =
    /href="(\/maps\/preview\/entitylist\/getlist\?[^"]+)"\s+as="fetch"/i;
  const m = html.match(re);
  if (m) {
    // html entities are encoded (&amp;) — decode
    const path = m[1].replace(/&amp;/g, "&");
    if (!path.includes(listId)) return null;
    return `https://www.google.com${path}`;
  }
  return null;
}

async function fetchListJson(getlistUrl: string, referer: string) {
  const res = await fetch(getlistUrl, {
    headers: {
      "user-agent": UA,
      referer,
      "accept-language": "tr-TR,tr;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`getlist ${res.status}`);
  const raw = await res.text();
  const cleaned = raw.replace(/^\)\]\}'\s*/, "");
  return JSON.parse(cleaned);
}

function walkPlaces(node: unknown, out: GoogleListPlace[]) {
  if (!Array.isArray(node)) return;
  // shape: [null, [null, null, LABEL, null, ADDRESS, [null, null, LAT, LNG], [placeIds...], "/g/..."], NAME, "", ...]
  if (
    node.length >= 3 &&
    node[0] === null &&
    Array.isArray(node[1]) &&
    typeof node[2] === "string"
  ) {
    const meta = node[1] as unknown[];
    if (meta.length >= 6 && Array.isArray(meta[5])) {
      const geo = meta[5] as unknown[];
      if (typeof geo[2] === "number" && typeof geo[3] === "number") {
        const placeIds = Array.isArray(meta[6]) ? (meta[6] as unknown[]) : null;
        const googlePlaceId =
          placeIds && typeof placeIds[0] === "string"
            ? (placeIds[0] as string)
            : null;
        out.push({
          name: node[2] as string,
          address: typeof meta[4] === "string" ? (meta[4] as string) : null,
          lat: geo[2],
          lng: geo[3],
          google_place_id: googlePlaceId,
          feature_id: typeof meta[7] === "string" ? (meta[7] as string) : null,
        });
        return;
      }
    }
  }
  for (const child of node) walkPlaces(child, out);
}

function dedupe(places: GoogleListPlace[]): GoogleListPlace[] {
  const seen = new Set<string>();
  return places.filter((p) => {
    const key = p.feature_id ?? `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function resolveGoogleList(
  shareUrl: string
): Promise<GoogleListResult | null> {
  const trimmed = shareUrl.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;

  // Follow short link (if any) to the final maps URL
  let pageUrl = trimmed;
  if (/maps\.app\.goo\.gl/.test(pageUrl)) {
    pageUrl = await followShort(pageUrl);
  }

  let listId = extractListId(pageUrl);

  const html = await fetchListHtml(pageUrl);
  if (!listId) listId = extractListId(html);
  if (!listId) return null;

  const canonicalPageUrl = `https://www.google.com/maps/placelists/list/${listId}`;
  const getlistUrl = extractGetlistUrl(html, listId);
  if (!getlistUrl) return null;

  const data = await fetchListJson(getlistUrl, canonicalPageUrl);
  const places: GoogleListPlace[] = [];
  walkPlaces(data, places);
  return { title: null, places: dedupe(places) };
}
