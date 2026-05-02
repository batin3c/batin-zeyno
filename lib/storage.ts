import "server-only";
import { db } from "./supabase";

const BUCKET = "baze-media";

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .slice(0, 60);
}

export async function uploadImage(
  file: File,
  folder: string
): Promise<string> {
  if (!file || !(file instanceof File) || file.size === 0) {
    throw new Error("Geçersiz dosya");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Sadece görsel yüklenebilir");
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("Dosya çok büyük (max 20 MB)");
  }

  const ext = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf("."))
    : "";
  const path = `${folder}/${Date.now()}-${sanitizeFilename(
    file.name.replace(ext, "")
  )}${ext}`;

  const { error } = await db.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;

  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Fetch an image from a remote URL and persist it in our bucket.
 * Returns null on failure (HTTP error, suspicious size, upload error) so
 * callers can drop the source URL silently instead of failing the whole insert.
 *
 * The Google Places JS SDK photo URL has an `r_url` parameter that pins it
 * to a referer; pass that as `referer` so Google returns the real photo
 * instead of the 100x100 access-denied placeholder.
 */
export async function uploadImageFromUrl(
  sourceUrl: string,
  folder: string,
  opts?: { referer?: string }
): Promise<string | null> {
  try {
    const res = await fetch(sourceUrl, {
      headers: opts?.referer ? { referer: opts.referer } : {},
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "image/jpeg";
    if (!ct.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // skip Google's tiny "denied" placeholder (~hundreds of bytes) and absurdly huge files
    if (buf.length < 2000 || buf.length > 10 * 1024 * 1024) return null;
    const ext = ct.includes("png")
      ? ".png"
      : ct.includes("webp")
      ? ".webp"
      : ".jpg";
    const path = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}${ext}`;
    const { error } = await db.storage.from(BUCKET).upload(path, buf, {
      contentType: ct,
      upsert: false,
    });
    if (error) return null;
    return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

export async function removeByUrl(url: string): Promise<void> {
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length).split("?")[0];
  if (!path) return;
  await db.storage.from(BUCKET).remove([path]);
}
