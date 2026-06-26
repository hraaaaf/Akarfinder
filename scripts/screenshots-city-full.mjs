import { chromium } from "playwright";
import { mkdirSync } from "fs";

const OUT = "./public/screenshots/city-full";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(name, url, width, height) {
  const page = await browser.newPage();
  await page.setViewportSize({ width, height });
  await page.goto(url, { waitUntil: "networkidle", timeout: 40000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  await page.close();
  console.log(`✓ ${name}.png`);
}

await shot("mobile-390", "http://localhost:3000", 390, 844);
await shot("tablet-768", "http://localhost:3000", 768, 1024);
await shot("desktop-1440", "http://localhost:3000", 1440, 900);

await browser.close();
console.log("Done.");
