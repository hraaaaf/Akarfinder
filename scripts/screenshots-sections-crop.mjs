import { chromium } from "playwright";
import { mkdirSync } from "fs";
const OUT = "./public/screenshots/city-section-bug";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 40000 });
// scroll to force images to load
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(2000);

// CityIntentGrid section (#villes)
const villes = await page.$("#villes");
if (villes) {
  await villes.screenshot({ path: `${OUT}/section-villes-mobile.png` });
  console.log("✓ section-villes-mobile (CityIntentGrid)");
}

// SignatureMapSection (#signature-map)
const sigMap = await page.$("#signature-map");
if (sigMap) {
  await sigMap.screenshot({ path: `${OUT}/section-signature-mobile.png` });
  console.log("✓ section-signature-mobile (SignatureMapSection)");
}

await page.close();
await browser.close();
