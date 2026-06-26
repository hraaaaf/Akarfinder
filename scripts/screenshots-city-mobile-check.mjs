import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3104";
const OUT = "public/screenshots/city-mobile-check";

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(name, url, viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  await ctx.close();
  console.log(`✓ ${name}`);
}

// Mobile — scroll to city section
const MOBI = { width: 390, height: 844 };
const browser2 = await chromium.launch();
const ctx = await browser2.newContext({ viewport: MOBI });
const page = await ctx.newPage();
await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 20000 });
await page.waitForTimeout(800);
// Scroll to villes section
await page.evaluate(() => {
  const el = document.getElementById("villes");
  if (el) el.scrollIntoView({ behavior: "instant" });
});
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/city-mobile-current.png`, fullPage: false });
await ctx.close();
await browser2.close();

await browser.close();
console.log("Done.");
