import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3104";
const OUT = "public/screenshots/p17a1";

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(name, url, viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  await ctx.close();
  console.log(`✓ ${name}`);
}

const DESK = { width: 1400, height: 900 };
const MOBI = { width: 390, height: 844 };

// Demo slug → doit retourner 404
await shot("p17a1-404-promoteur-desktop", `${BASE}/promoteurs/exemple-promoteur`, DESK);
await shot("p17a1-404-projet-mobile", `${BASE}/projets/exemple-programme`, MOBI);

await browser.close();
console.log("Done.");
