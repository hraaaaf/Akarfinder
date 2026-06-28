// LOGO-ASSETS-INTEGRATION-1 — détourage du fond uni (autorisé par Achraf).
// Le LOGO n'est pas modifié : on calcule l'alpha à partir de la distance au fond
// (blanc OU noir), avec un léger feather, puis on rogne les marges transparentes.
// Aucune couleur/forme du logo touchée.
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public", "brand", "logo-v2");

// mode "white" : fond clair → alpha via min(R,G,B) (le logo a des pixels non-clairs)
// mode "black" : fond sombre → alpha via max(R,G,B) (le logo est clair)
async function knockout(src, outName, mode) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += channels) {
    const r = out[i], g = out[i + 1], b = out[i + 2];
    let a;
    if (mode === "white") {
      const m = Math.min(r, g, b);
      // bg blanc: m~255 → a=0 ; logo: m plus bas → a=255 ; feather 235..250
      a = m >= 250 ? 0 : m <= 235 ? 255 : Math.round((250 - m) / 15 * 255);
    } else {
      const m = Math.max(r, g, b);
      // bg noir: m~14 → a=0 ; logo blanc: m~255 → a=255 ; feather 20..40
      a = m <= 20 ? 0 : m >= 40 ? 255 : Math.round((m - 20) / 20 * 255);
    }
    out[i + 3] = a;
  }
  await sharp(out, { raw: { width, height, channels } })
    .trim({ threshold: 1 })
    .png()
    .toFile(path.join(outDir, outName));
  console.log("knockout", outName, mode, `${width}x${height}`);
}

const dir = process.argv[2]; // uploads dir
const F = {
  bilingual: "bf88fed5-35A102B9B537490EB00B2B72E431387E.png", // ink on white
  symbol: "b2021774-5B47AD5E2FF944E7A06DCE27AEA6DE7E.png",     // ink+star on white
  headerInk: "458805ab-232AD48C35C94EE48DE42CB341906607.png",  // AF+AkarFinder ink on white
  headerWhite: "472daecf-2C38806556C24E0195DEC7104F62B809.png",// AF+AkarFinder white on black
};

await knockout(path.join(dir, F.headerInk), "logo-header-light.png", "white");   // pour fond clair
await knockout(path.join(dir, F.headerWhite), "logo-header-dark.png", "black");  // pour fond sombre
await knockout(path.join(dir, F.symbol), "logo-symbol.png", "white");            // symbole transparent
await knockout(path.join(dir, F.bilingual), "logo-horizontal-bilingual.png", "white"); // bilingue transparent
console.log("DONE");
