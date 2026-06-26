import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3104";
const OUT = "public/screenshots/city-mobile-check";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 20000 });
await page.waitForTimeout(1200);

// Clip to the #villes section
const clip = await page.evaluate(() => {
  const el = document.getElementById("villes");
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    x: 0,
    y: rect.top + window.scrollY,
    width: 390,
    height: rect.height,
  };
});

console.log("Section clip:", clip);

// Full page to capture the section
await page.screenshot({
  path: `${OUT}/city-mobile-allcards.png`,
  fullPage: true,
  clip: clip ?? undefined,
});

await ctx.close();
await browser.close();
console.log("Done.");
