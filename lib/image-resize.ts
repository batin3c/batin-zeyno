// Client-side image downscale before upload.
// iPhone HEIC: browser converts to PNG/JPEG via createImageBitmap.
// Returns a JPEG Blob at most MAX_DIM on its longest edge.

const MAX_DIM = 2400;
const QUALITY = 0.85;

export async function resizeForUpload(file: File): Promise<File> {
  // skip non-images and tiny files
  if (!file.type.startsWith("image/")) return file;
  if (file.size < 800 * 1024) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // can't decode (e.g. HEIC on browsers without support) — fall back to raw
    return file;
  }

  const { width: w, height: h } = bitmap;
  const longest = Math.max(w, h);
  if (longest <= MAX_DIM) {
    bitmap.close();
    return file;
  }

  const scale = MAX_DIM / longest;
  const tw = Math.round(w * scale);
  const th = Math.round(h * scale);

  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(tw, th)
      : Object.assign(document.createElement("canvas"), {
          width: tw,
          height: th,
        });

  const ctx = (canvas as HTMLCanvasElement | OffscreenCanvas).getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  // @ts-expect-error - both canvas types share drawImage signature
  ctx.drawImage(bitmap, 0, 0, tw, th);
  bitmap.close();

  let blob: Blob;
  if (canvas instanceof OffscreenCanvas) {
    blob = await canvas.convertToBlob({ type: "image/jpeg", quality: QUALITY });
  } else {
    blob = await new Promise<Blob>((res, rej) =>
      (canvas as HTMLCanvasElement).toBlob(
        (b) => (b ? res(b) : rej(new Error("toBlob failed"))),
        "image/jpeg",
        QUALITY
      )
    );
  }

  // keep original name but force .jpg extension
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}
