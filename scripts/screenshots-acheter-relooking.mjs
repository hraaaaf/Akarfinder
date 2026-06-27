import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3000";
const OUT = "public/screenshots/intent-relooking-acheter";

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(name, url, viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  await ctx.close();
  console.log(`✓ ${name}`);
}

const DESK = { width: 1400, height: 900 };
const MOBI = { width: 390, height: 844 };

await shot("acheter-desktop", `${BASE}/acheter`, DESK);
await shot("acheter-mobile", `${BASE}/acheter`, MOBI);

// Zoom sections — desktop
{
  const ctx = await browser.newContext({ viewport: DESK });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/acheter`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(800);

  // Hero section
  const hero = page.locator("section").first();
  await hero.screenshot({ path: `${OUT}/acheter-desktop-hero.png` });
  console.log("✓ acheter-desktop-hero");

  // Listing cards section
  const cards = page.locator("section").nth(2);
  await cards.screenshot({ path: `${OUT}/acheter-desktop-cards.png` });
  console.log("✓ acheter-desktop-cards");

  await ctx.close();
}

// Smoke tests — homepage and search
await shot("home-check", `${BASE}`, DESK);
await shot("search-check", `${BASE}/search`, DESK);
await shot("compare-check", `${BASE}/compare`, DESK);

await browser.close();
console.log("Done — screenshots saved to", OUT);
