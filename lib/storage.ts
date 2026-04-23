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

export async function removeByUrl(url: string): Promise<void> {
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length).split("?")[0];
  if (!path) return;
  await db.storage.from(BUCKET).remove([path]);
}
