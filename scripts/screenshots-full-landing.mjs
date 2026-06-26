import { chromium } from "playwright";
import { mkdirSync } from "fs";
const OUT = "./public/screenshots/city-section-bug";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

async function shot(name, url, width, height) {
  const page = await browser.newPage();
  await page.setViewportSize({ width, height });
  // Force eager loading of all images
  await page.route('**/*', route => route.continue());
  await page.goto(url, { waitUntil: "networkidle", timeout: 40000 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  await page.close();
  console.log("✓ " + name);
}

await shot("full-mobile-after", "http://localhost:3000", 390, 844);
await shot("full-desktop-after", "http://localhost:3000", 1440, 900);
await browser.close();
console.log("Done.");
