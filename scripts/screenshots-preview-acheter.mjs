import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "https://akarfinder-43bdaflol-achraf-benmoussa-s-projects.vercel.app";
const OUT = "public/screenshots/intent-relooking-acheter";

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(name, url, viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 40000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  await ctx.close();
  console.log(`✓ ${name}`);
}

const DESK = { width: 1400, height: 900 };
const MOBI = { width: 390, height: 844 };

await shot("preview-acheter-desktop", `${BASE}/acheter`, DESK);
await shot("preview-acheter-mobile", `${BASE}/acheter`, MOBI);

await browser.close();
console.log("Done — Preview screenshots saved.");
