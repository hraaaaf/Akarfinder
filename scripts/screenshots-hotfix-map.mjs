import { chromium } from "playwright";
import { mkdirSync } from "fs";

const OUT = "./public/screenshots/hotfix-map";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(name, url, width, height) {
  const page = await browser.newPage();
  await page.setViewportSize({ width, height });
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  await page.close();
  console.log(`✓ ${name}.png`);
}

await shot("map-desktop", "http://localhost:3000/map", 1440, 900);
await shot("map-mobile", "http://localhost:3000/map", 390, 844);
await browser.close();
console.log("Done.");
