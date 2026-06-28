// HERO-IMAGE-REPLACE-1 — convert uploaded PNGs to optimized WebP hero assets.
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public", "images", "hero");

const DESKTOP_SRC = process.argv[2];
const MOBILE_SRC = process.argv[3];

async function run() {
  // Desktop — horizontal (1672x941). Keep aspect, quality 82.
  const desktopOut = path.join(outDir, "akar-residence-sunset-desktop.webp");
  const d = await sharp(DESKTOP_SRC)
    .webp({ quality: 82, effort: 6 })
    .toFile(desktopOut);
  console.log(`desktop -> ${desktopOut} ${Math.round(d.size / 1024)}KB ${d.width}x${d.height}`);

  // Mobile — vertical (941x1672). Quality 80.
  const mobileOut = path.join(outDir, "akar-residence-sunset-mobile.webp");
  const m = await sharp(MOBILE_SRC)
    .webp({ quality: 80, effort: 6 })
    .toFile(mobileOut);
  console.log(`mobile  -> ${mobileOut} ${Math.round(m.size / 1024)}KB ${m.width}x${m.height}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
