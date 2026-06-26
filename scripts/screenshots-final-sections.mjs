import { chromium } from "playwright";
import { mkdirSync } from "fs";
const OUT = "./public/screenshots/city-final";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

async function shotSection(name, url, width, height, selector) {
  const page = await browser.newPage();
  await page.setViewportSize({ width, height });
  await page.goto(url, { waitUntil: "networkidle", timeout: 40000 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  const el = await page.$(selector);
  if (el) await el.screenshot({ path: `${OUT}/${name}.png` });
  await page.close();
  console.log("✓ " + name);
}

// Mobile
await shotSection("mobile-villes", "http://localhost:3000", 390, 844, "#villes");
await shotSection("mobile-carte", "http://localhost:3000", 390, 844, "#signature-map");
// Desktop
await shotSection("desktop-villes", "http://localhost:3000", 1440, 900, "#villes");
await shotSection("desktop-carte", "http://localhost:3000", 1440, 900, "#signature-map");

await browser.close();
console.log("Done.");
