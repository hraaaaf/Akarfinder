import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3104";
const OUT = "public/screenshots/city-mobile-check";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 20000 });
await page.waitForTimeout(1000);

// Scroll to section and take a fullPage screenshot of just the villes section
const sectionBounds = await page.evaluate(() => {
  const el = document.getElementById("villes");
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { top: rect.top + window.scrollY, height: rect.height };
});

await page.evaluate(() => {
  const el = document.getElementById("villes");
  if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/city-mobile-section.png`, fullPage: false });

await ctx.close();
await browser.close();
console.log("Done.");
