import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3106";
const OUT = "public/screenshots/city-mobile-new";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 25000 });
await page.waitForTimeout(1500);

const clip = await page.evaluate(() => {
  const el = document.getElementById("villes");
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { x: 0, y: rect.top + window.scrollY, width: 390, height: rect.height };
});

// fullPage: true required when clip is below viewport
await page.screenshot({ path: `${OUT}/mobile-villes-full.png`, fullPage: true, clip: clip ?? undefined });

await ctx.close();
await browser.close();
console.log("Done. Section height:", clip?.height);
