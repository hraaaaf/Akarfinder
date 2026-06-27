import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3000";
const OUT = "public/screenshots/intent-relooking-neuf";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(name, url, viewport, full = true) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  await ctx.close();
  console.log(`✓ ${name}`);
}

const DESK = { width: 1440, height: 900 };
const MOBI = { width: 390, height: 844 };

await shot("neuf-desktop", `${BASE}/neuf`, DESK, true);
await shot("neuf-desktop-hero", `${BASE}/neuf`, DESK, false);
await shot("neuf-mobile", `${BASE}/neuf`, MOBI, true);
await shot("neuf-mobile-hero", `${BASE}/neuf`, MOBI, false);
// non-régression
await shot("acheter-check", `${BASE}/acheter`, DESK, false);
await shot("louer-check", `${BASE}/louer`, DESK, false);

await browser.close();
console.log("Done");
