// LOGO-ASSETS-INTEGRATION-1 — favicons par simple redimensionnement de l'app-icon
// V2 fourni (public/brand/logo-v2/logo-favicon.png). AUCUNE retouche : resize only.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brand = path.resolve(__dirname, "..", "public", "brand");
const SRC = path.join(brand, "logo-v2", "logo-favicon.png");

function buildIco(pngBuffer, dim) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
  const dir = Buffer.alloc(16);
  dir.writeUInt8(dim >= 256 ? 0 : dim, 0); dir.writeUInt8(dim >= 256 ? 0 : dim, 1);
  dir.writeUInt8(0, 2); dir.writeUInt8(0, 3);
  dir.writeUInt16LE(1, 4); dir.writeUInt16LE(32, 6);
  dir.writeUInt32LE(pngBuffer.length, 8); dir.writeUInt32LE(22, 12);
  return Buffer.concat([header, dir, pngBuffer]);
}

async function run() {
  for (const s of [16, 32, 48, 64, 128, 256, 512, 1024]) {
    await sharp(SRC).resize(s, s, { fit: "fill" }).png().toFile(path.join(brand, `favicon-${s}.png`));
    console.log("favicon", s);
  }
  const ico48 = await sharp(SRC).resize(48, 48, { fit: "fill" }).png().toBuffer();
  fs.writeFileSync(path.join(brand, "favicon.ico"), buildIco(ico48, 48));
  console.log("favicon.ico 48");

  await sharp(SRC).resize(180, 180, { fit: "fill" }).png().toFile(path.join(brand, "apple-touch-icon.png"));
  await sharp(SRC).resize(512, 512, { fit: "fill" }).png().toFile(path.join(brand, "app-icon-512.png"));
  await sharp(SRC).resize(1024, 1024, { fit: "fill" }).png().toFile(path.join(brand, "app-icon-1024.png"));
  await sharp(SRC).resize(512, 512, { fit: "fill" }).png().toFile(path.join(brand, "icon-maskable-512.png"));
  console.log("apple-touch + app-icons + maskable");
  console.log("DONE");
}
run().catch((e) => { console.error(e); process.exit(1); });
