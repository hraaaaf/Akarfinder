import { chromium } from "playwright";
import { mkdirSync } from "fs";
const OUT = "./public/screenshots/city-section-bug";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

async function shot(name, url, width, height) {
  const page = await browser.newPage();
  await page.setViewportSize({ width, height });
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1500);
  const section = await page.$("#signature-map");
  if (section) await section.screenshot({ path: `${OUT}/${name}.png` });
  await page.close();
  console.log("✓ " + name);
}

await shot("after-mobile-390", "http://localhost:3000", 390, 844);
await shot("after-desktop-1440", "http://localhost:3000", 1440, 900);
await browser.close();
