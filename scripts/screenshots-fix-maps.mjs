import { chromium } from "playwright";

const browser = await chromium.launch();

// ── 1. map-section-desktop.png — carte sans header AkarFinder ───────────────
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://localhost:3000/map", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);
  // Header = 64px. Clip everything below it.
  await page.screenshot({
    path: "./public/images/map-section-desktop.png",
    clip: { x: 0, y: 64, width: 1440, height: 836 },
  });
  await page.close();
  console.log("✓ map-section-desktop.png (sans header)");
}

// ── 2. map-section-mobile.png — carte Maroc avec pins, sans header ──────────
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3000/map", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3500);
  // Header = 64px. Capture full map content area below.
  await page.screenshot({
    path: "./public/images/map-section-mobile.png",
    clip: { x: 0, y: 64, width: 390, height: 780 },
  });
  await page.close();
  console.log("✓ map-section-mobile.png (sans header)");
}

await browser.close();
console.log("Maps done.");
