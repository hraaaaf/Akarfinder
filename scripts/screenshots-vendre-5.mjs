import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3000";
const OUT = "public/screenshots/intent-relooking-vendre";
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

await shot("vendre-desktop", `${BASE}/vendre`, DESK, true);
await shot("vendre-desktop-hero", `${BASE}/vendre`, DESK, false);
await shot("vendre-mobile", `${BASE}/vendre`, MOBI, true);
await shot("vendre-mobile-hero", `${BASE}/vendre`, MOBI, false);
// non-régression
await shot("promoteurs-check", `${BASE}/promoteurs`, DESK, false);

await browser.close();
console.log("Done");
