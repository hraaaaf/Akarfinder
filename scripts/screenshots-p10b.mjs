import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "http://localhost:3300";
const OUT = "public/screenshots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(path, filename, width) {
  const page = await browser.newPage();
  await page.setViewportSize({ width, height: 900 });
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 20000 });
  console.log(filename, "status:", res?.status());
  await page.waitForTimeout(2000); // wait for MapLibre tiles
  await page.screenshot({ path: `${OUT}/${filename}`, fullPage: false });
  await page.close();
  console.log("✓", filename);
}

// /map desktop
await shot("/map", "p10b-map-desktop.png", 1440);
// /map mobile
await shot("/map", "p10b-map-mobile.png", 390);
// /map with city filter
await shot("/map?city=Casablanca", "p10b-map-casablanca.png", 1440);
// /search with "Voir la carte" button visible
await shot("/search", "p10b-search-with-map-btn.png", 1440);

await browser.close();
console.log("Done.");
