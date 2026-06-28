// LOGO-REFINE-1 — régénère favicons / app-icons / masters depuis le nouveau mark AF.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brand = path.resolve(__dirname, "..", "public", "brand");

const DEEPBLUE = "#071B33";
const BRONZE_LIGHT = "#C2A368";
const BRONZE = "#9B7838";

// Géométrie du mark (identique à components/ui/BrandLogo.tsx), viewBox 120x88.
const MARK_INNER = `
  <mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="88">
    <g fill="#fff">
      <polygon points="5,84 25,84 53,22 42,22"/>
      <polygon points="42,22 53,22 47.5,6"/>
      <rect x="52" y="22" width="19" height="62"/>
      <rect x="46" y="11" width="68" height="15"/>
      <rect x="30" y="41" width="74" height="15"/>
    </g>
    <g fill="#000">
      <polygon points="47.5,15 53,40 42,40"/>
      <path d="M 36 84 L 36 65 Q 36 58 41 56 L 44.5 49 Q 48 56 52 58 Q 53.5 60 53.5 66 L 53.5 84 Z"/>
    </g>
  </mask>`;

// Mark seul (transparent), couleur paramétrable. viewBox 120x88.
function markSvg(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 88">
  <defs>${MARK_INNER}</defs>
  <rect width="120" height="88" fill="${color}" mask="url(#m)"/>
</svg>`;
}

// Badge carré (favicon / app icon) : fond deepblue arrondi + mark bronze centré.
function badgeSvg(size, { rounded = true, padRatio = 0.22, markColor = BRONZE_LIGHT } = {}) {
  const r = rounded ? Math.round(size * 0.22) : 0;
  const markW = size * (1 - padRatio * 2);
  const markH = (markW / 120) * 88;
  const x = (size - markW) / 2;
  const y = (size - markH) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>${MARK_INNER}</defs>
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${DEEPBLUE}"/>
  <g transform="translate(${x},${y})">
    <svg width="${markW}" height="${markH}" viewBox="0 0 120 88">
      <rect width="120" height="88" fill="${markColor}" mask="url(#m)"/>
    </svg>
  </g>
</svg>`;
}

async function png(svg, size, out) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
  console.log("png", path.basename(out), size);
}

// Minimal ICO (single PNG-encoded 48x48 entry).
function buildIco(pngBuffer, dim) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const dir = Buffer.alloc(16);
  dir.writeUInt8(dim >= 256 ? 0 : dim, 0);
  dir.writeUInt8(dim >= 256 ? 0 : dim, 1);
  dir.writeUInt8(0, 2);
  dir.writeUInt8(0, 3);
  dir.writeUInt16LE(1, 4);
  dir.writeUInt16LE(32, 6);
  dir.writeUInt32LE(pngBuffer.length, 8);
  dir.writeUInt32LE(22, 12);
  return Buffer.concat([header, dir, pngBuffer]);
}

async function run() {
  // Favicons (badge deepblue arrondi)
  for (const s of [16, 32, 48, 64, 128, 256, 512, 1024]) {
    await png(badgeSvg(s), s, path.join(brand, `favicon-${s}.png`));
  }
  // favicon.ico (48x48 PNG-encoded)
  const ico48 = await sharp(Buffer.from(badgeSvg(48))).resize(48, 48).png().toBuffer();
  fs.writeFileSync(path.join(brand, "favicon.ico"), buildIco(ico48, 48));
  console.log("ico favicon.ico 48");

  // apple-touch-icon (180, fond plein deepblue, coins gérés par iOS → rounded ok)
  await png(badgeSvg(180), 180, path.join(brand, "apple-touch-icon.png"));

  // app-icons (512 / 1024, rounded)
  await png(badgeSvg(512), 512, path.join(brand, "app-icon-512.png"));
  await png(badgeSvg(1024), 1024, path.join(brand, "app-icon-1024.png"));

  // maskable (padding plus large, carré plein non arrondi pour zone de sécurité)
  await png(badgeSvg(512, { rounded: false, padRatio: 0.3 }), 512, path.join(brand, "icon-maskable-512.png"));

  // Masters mark transparent (SVG + PNG)
  fs.writeFileSync(path.join(brand, "mark.svg"), markSvg("currentColor"));
  fs.writeFileSync(path.join(brand, "mark-bronze.svg"), markSvg(BRONZE));
  fs.writeFileSync(path.join(brand, "mark-deepblue.svg"), markSvg(DEEPBLUE));
  const markH = 743, markW = Math.round((markH / 88) * 120);
  for (const [name, color] of [
    ["mark-bronze", BRONZE], ["mark-bronze-light", BRONZE_LIGHT],
    ["mark-deepblue", DEEPBLUE], ["mark-black", "#0B0B0C"], ["mark-white", "#FFFFFF"],
  ]) {
    await sharp(Buffer.from(markSvg(color))).resize(markW, markH).png()
      .toFile(path.join(brand, `${name}.png`));
    console.log("mark", name, `${markW}x${markH}`);
  }

  console.log("DONE");
}

run().catch((e) => { console.error(e); process.exit(1); });
