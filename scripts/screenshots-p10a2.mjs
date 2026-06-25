import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const BASE = "http://localhost:3000";
const OUT = "public/screenshots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(path, filename, width, height = 900) {
  const page = await browser.newPage();
  await page.setViewportSize({ width, height });
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(800);
  // expand full page
  const fullH = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewportSize({ width, height: Math.max(height, fullH) });
  await page.screenshot({ path: join(OUT, filename), fullPage: false });
  await page.close();
  console.log("✓", filename);
}

// Homepage desktop
await shot("/", "p10a2-home-desktop.png", 1440, 900);
// Homepage mobile
await shot("/", "p10a2-home-mobile.png", 390, 844);
// /search desktop
await shot("/search", "p10a2-search-desktop.png", 1440, 900);
// /search mobile
await shot("/search", "p10a2-search-mobile.png", 390, 844);
// detail desktop
await shot("/listings/casablanca-finance-city-terrasse", "p10a2-detail-desktop.png", 1440, 900);
// detail mobile
await shot("/listings/casablanca-finance-city-terrasse", "p10a2-detail-mobile.png", 390, 844);

await browser.close();
console.log("Done.");
