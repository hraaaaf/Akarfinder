import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3000";
const OUT = "public/screenshots/intent-relooking-acheter";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(name, url, viewport, full = true) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  await ctx.close();
  console.log(`✓ ${name}`);
}

const DESK = { width: 1400, height: 900 };
const MOBI = { width: 390, height: 844 };

await shot("acheter-desktop-1b", `${BASE}/acheter`, DESK, true);
await shot("acheter-mobile-1b",  `${BASE}/acheter`, MOBI, true);
await shot("acheter-desktop-hero-1b", `${BASE}/acheter`, DESK, false);
await shot("acheter-mobile-hero-1b",  `${BASE}/acheter`, MOBI, false);

// Smoke tests
await shot("home-1b",    `${BASE}`,        DESK, false);
await shot("search-1b",  `${BASE}/search`, DESK, false);
await shot("compare-1b", `${BASE}/compare`,DESK, false);

await browser.close();
console.log("Done — screenshots saved to", OUT);
