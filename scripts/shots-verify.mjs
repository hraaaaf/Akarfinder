import { chromium } from "playwright";
import { mkdirSync } from "fs";
const OUT = "./public/screenshots/verify-final";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

async function shot(name, url, w, h, selector) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: w, height: h });
  await page.goto(url, { waitUntil: "networkidle", timeout: 40000 });
  await page.waitForTimeout(1500);
  const el = await page.$(selector);
  if (el) await el.screenshot({ path: `${OUT}/${name}.png` });
  await page.close();
  console.log("✓", name);
}

await shot("mobile-villes", "http://localhost:3000", 390, 844, "#villes");
await shot("mobile-carte", "http://localhost:3000", 390, 844, "#signature-map");
await shot("desktop-villes", "http://localhost:3000", 1440, 900, "#villes");
await shot("desktop-carte", "http://localhost:3000", 1440, 900, "#signature-map");
await browser.close();
