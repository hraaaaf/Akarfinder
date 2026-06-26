import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3106";
const OUT = "public/screenshots/city-mobile-new";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

// Mobile
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 25000 });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const el = document.getElementById("villes");
  if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/mobile-villes.png`, fullPage: false });
await ctx.close();

// Desktop
const ctxD = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const pageD = await ctxD.newPage();
await pageD.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 25000 });
await pageD.waitForTimeout(1500);
await pageD.evaluate(() => {
  const el = document.getElementById("villes");
  if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
});
await pageD.waitForTimeout(800);
await pageD.screenshot({ path: `${OUT}/desktop-villes.png`, fullPage: false });
await ctxD.close();

await browser.close();
console.log("Done.");
