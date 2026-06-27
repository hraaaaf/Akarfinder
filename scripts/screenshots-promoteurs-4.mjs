import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3000";
const OUT = "public/screenshots/intent-relooking-promoteurs";
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

await shot("promoteurs-desktop", `${BASE}/promoteurs`, DESK, true);
await shot("promoteurs-desktop-hero", `${BASE}/promoteurs`, DESK, false);
await shot("promoteurs-mobile", `${BASE}/promoteurs`, MOBI, true);
await shot("promoteurs-mobile-hero", `${BASE}/promoteurs`, MOBI, false);
// non-régression
await shot("neuf-check", `${BASE}/neuf`, DESK, false);

await browser.close();
console.log("Done");
