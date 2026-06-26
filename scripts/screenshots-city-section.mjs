import { chromium } from "playwright";
import { mkdirSync } from "fs";

const OUT = "./public/screenshots/city-section-bug";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(name, url, width, height) {
  const page = await browser.newPage();
  await page.setViewportSize({ width, height });
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  // Scroll to the city section
  await page.evaluate(() => {
    const el = document.querySelector("#villes");
    if (el) el.scrollIntoView({ block: "start" });
  });
  await page.waitForTimeout(1500);
  const section = await page.$("#villes");
  if (section) {
    await section.screenshot({ path: `${OUT}/${name}.png` });
  } else {
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  }
  await page.close();
  console.log(`✓ ${name}.png`);
}

// Local
await shot("local-mobile", "http://localhost:3000", 390, 844);
await shot("local-desktop", "http://localhost:3000", 1440, 900);

await browser.close();
console.log("Done.");
