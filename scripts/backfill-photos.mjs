// One-shot script: for every city & location with a google_place_id but
// zero photos in our DB, fetch up to 3 photos from Google Place Photos API,
// upload to Supabase storage, insert rows. Idempotent — re-running skips
// anyone who got photos last time.
//
// Run from F:/Github/Batin-Zeyno/baze with `node scripts/backfill-photos.mjs`.
// Reads .env.local for SUPABASE_URL, SERVICE_ROLE_KEY, MAPS API key.

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const env = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
const get = (k) => {
  const m = env.match(new RegExp("^" + k + "=(.+)$", "m"));
  return m ? m[1].replace(/^['"]|['"]$/g, "").trim() : "";
};
const SUPABASE_URL = get("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE = get("SUPABASE_SERVICE_ROLE_KEY");
const MAPS_KEY = get("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
if (!SUPABASE_URL || !SERVICE_ROLE || !MAPS_KEY) {
  console.error("missing env vars");
  process.exit(1);
}

const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const BUCKET = "baze-media";

async function fetchPlacePhotoRefs(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
    placeId
  )}&fields=photos&key=${MAPS_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  const photos = json?.result?.photos ?? [];
  return photos
    .slice(0, 3)
    .map((p) => p.photo_reference)
    .filter(Boolean);
}

async function downloadAndUpload(photoRef, folder) {
  // Place Photos API returns a 302 to lh3.googleusercontent.com; fetch will
  // follow it and we get the bytes back.
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photoreference=${encodeURIComponent(
    photoRef
  )}&key=${MAPS_KEY}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) return null;
  const ct = res.headers.get("content-type") ?? "image/jpeg";
  if (!ct.startsWith("image/")) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000 || buf.length > 10 * 1024 * 1024) return null;
  const ext = ct.includes("png")
    ? ".png"
    : ct.includes("webp")
    ? ".webp"
    : ".jpg";
  const filePath = `${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}${ext}`;
  const { error } = await supa.storage
    .from(BUCKET)
    .upload(filePath, buf, { contentType: ct, upsert: false });
  if (error) {
    console.warn("upload err:", error.message);
    return null;
  }
  return supa.storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl;
}

async function backfillCities() {
  // cities with a google_place_id whose city_photos count is 0
  const { data: cities } = await supa
    .from("visited_cities")
    .select("id, name, group_id, google_place_id, added_by")
    .not("google_place_id", "is", null);
  if (!cities || cities.length === 0) {
    console.log("[cities] none with place_id");
    return;
  }
  let touched = 0;
  for (const c of cities) {
    const { count } = await supa
      .from("city_photos")
      .select("id", { count: "exact", head: true })
      .eq("city_id", c.id);
    if ((count ?? 0) > 0) continue;
    const refs = await fetchPlacePhotoRefs(c.google_place_id);
    if (refs.length === 0) {
      console.log(`[city] ${c.name}: no google photos`);
      continue;
    }
    const urls = [];
    for (const ref of refs) {
      const url = await downloadAndUpload(ref, `cities/${c.id}`);
      if (url) urls.push(url);
    }
    if (urls.length === 0) {
      console.log(`[city] ${c.name}: download failed`);
      continue;
    }
    const rows = urls.map((url) => ({
      city_id: c.id,
      url,
      added_by: c.added_by,
      group_id: c.group_id,
    }));
    const { error } = await supa.from("city_photos").insert(rows);
    if (error) {
      console.warn(`[city] ${c.name}: insert err`, error.message);
    } else {
      touched++;
      console.log(`[city] ${c.name}: +${urls.length} photos`);
    }
  }
  console.log(`[cities] backfilled ${touched}/${cities.length}`);
}

async function backfillLocations() {
  const { data: locs } = await supa
    .from("locations")
    .select("id, name, trip_id, google_place_id, google_photo_urls, added_by")
    .not("google_place_id", "is", null);
  if (!locs || locs.length === 0) {
    console.log("[locations] none with place_id");
    return;
  }
  let touched = 0;
  for (const l of locs) {
    if (Array.isArray(l.google_photo_urls) && l.google_photo_urls.length > 0) {
      continue; // already has google photos
    }
    const refs = await fetchPlacePhotoRefs(l.google_place_id);
    if (refs.length === 0) {
      console.log(`[loc] ${l.name}: no google photos`);
      continue;
    }
    const urls = [];
    for (const ref of refs) {
      const url = await downloadAndUpload(ref, `google/${l.trip_id}`);
      if (url) urls.push(url);
    }
    if (urls.length === 0) {
      console.log(`[loc] ${l.name}: download failed`);
      continue;
    }
    const { error } = await supa
      .from("locations")
      .update({
        google_photo_urls: urls,
        updated_at: new Date().toISOString(),
      })
      .eq("id", l.id);
    if (error) {
      console.warn(`[loc] ${l.name}: update err`, error.message);
    } else {
      touched++;
      console.log(`[loc] ${l.name}: +${urls.length} photos`);
    }
  }
  console.log(`[locations] backfilled ${touched}/${locs.length}`);
}

await backfillCities();
await backfillLocations();
console.log("done");
