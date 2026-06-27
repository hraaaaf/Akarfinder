import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3000";
const OUT = "public/screenshots/intent-relooking-louer";
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

await shot("louer-desktop", `${BASE}/louer`, DESK, true);
await shot("louer-desktop-hero", `${BASE}/louer`, DESK, false);
await shot("louer-mobile", `${BASE}/louer`, MOBI, true);
await shot("louer-mobile-hero", `${BASE}/louer`, MOBI, false);
// non-régression Acheter
await shot("acheter-desktop-check", `${BASE}/acheter`, DESK, false);

await browser.close();
console.log("Done");
