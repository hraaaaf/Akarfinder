import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3201";
const OUT = "public/screenshots/p16c";

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(name, url, viewport, selector) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1200);
  if (selector) {
    const el = page.locator(selector);
    await el.screenshot({ path: `${OUT}/${name}.png` });
  } else {
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  }
  await ctx.close();
  console.log("✓", name);
}

const D = { width: 1440, height: 900 };
const M = { width: 390, height: 844 };

// 1 — /neuf desktop full
await shot("neuf-desktop-full", `${BASE}/neuf`, D);

// 2 — /neuf mobile full
await shot("neuf-mobile-full", `${BASE}/neuf`, M);

// 3 — section projets neufs desktop (listings grid)
await shot("neuf-desktop-projets", `${BASE}/neuf`, D, "section:has(h2:text('Biens et programmes disponibles'))");

// 4 — section brochure/rappel mobile
await shot("neuf-mobile-brochure", `${BASE}/neuf`, M, "section:has(h2:text('Demander des informations'))");

// 5 — section comparaison desktop
await shot("neuf-desktop-comparaison", `${BASE}/neuf`, D, "section.grid:has(h3:text('Comparer neuf vs ancien'))");

// 6 — /promoteurs desktop (unchanged, for reference)
await shot("promoteurs-desktop-full", `${BASE}/promoteurs`, D);

await browser.close();
console.log("Done — screenshots in", OUT);
