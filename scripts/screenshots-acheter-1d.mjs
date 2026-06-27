import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3000";
const OUT = "public/screenshots/intent-relooking-acheter";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(name, url, viewport, full = true, clip = null) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1300);
  const opts = { path: `${OUT}/${name}.png` };
  if (clip) opts.clip = clip;
  else opts.fullPage = full;
  await page.screenshot(opts);
  await ctx.close();
  console.log(`✓ ${name}`);
}

const DESK = { width: 1440, height: 900 };
const MOBI = { width: 390, height: 844 };

// Desktop
await shot("acheter-desktop-1d", `${BASE}/acheter`, DESK, true);
await shot("acheter-desktop-hero-1d", `${BASE}/acheter`, DESK, false);
await shot("acheter-desktop-cards-1d", `${BASE}/acheter`, DESK, false, { x: 0, y: 620, width: 1440, height: 760 });
// Mobile
await shot("acheter-mobile-1d", `${BASE}/acheter`, MOBI, true);
await shot("acheter-mobile-hero-1d", `${BASE}/acheter`, MOBI, false);

await browser.close();
console.log("Done");
