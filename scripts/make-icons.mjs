import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, "..", "WhatsApp Image 2026-04-24 at 14.04.04 (1).jpeg");
const outDir = join(__dirname, "..", "public", "icons");

// centre-cropped square
async function squareCrop(size) {
  return sharp(src)
    .resize(size, size, { fit: "cover", position: "attention" })
    .png({ compressionLevel: 9 });
}

// maskable: 20% safe zone, photo scaled to 60% of canvas, centred, pastel bg
async function maskable(size) {
  const inner = Math.round(size * 0.62);
  const pad = Math.round((size - inner) / 2);
  const photoBuf = await sharp(src)
    .resize(inner, inner, { fit: "cover", position: "attention" })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: { r: 0xff, g: 0xd6, b: 0xe5 }, // --accent-soft pink
    },
  })
    .composite([{ input: photoBuf, top: pad, left: pad }])
    .png({ compressionLevel: 9 });
}

async function run() {
  await (await squareCrop(192)).toFile(join(outDir, "icon-192.png"));
  await (await squareCrop(512)).toFile(join(outDir, "icon-512.png"));
  await (await squareCrop(180)).toFile(join(outDir, "apple-touch-icon.png"));
  await (await maskable(512)).toFile(join(outDir, "icon-maskable.png"));
  console.log("icons generated");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
