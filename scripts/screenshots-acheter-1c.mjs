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

await shot("acheter-desktop-1c", `${BASE}/acheter`, DESK, true);
await shot("acheter-mobile-1c",  `${BASE}/acheter`, MOBI, true);
await shot("acheter-desktop-viewport-1c", `${BASE}/acheter`, DESK, false);
await shot("acheter-mobile-viewport-1c",  `${BASE}/acheter`, MOBI, false);

await browser.close();
console.log("Done — screenshots in", OUT);
