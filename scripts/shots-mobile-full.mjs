import { chromium } from "playwright";
const OUT = "./public/screenshots/verify-final";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 40000 });
// scroll to trigger all lazy loads
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(3000);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);

// screenshot just #villes section
const villes = await page.$("#villes");
await villes.scrollIntoViewIfNeeded();
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/mobile-villes-full.png`, fullPage: false, clip: await villes.boundingBox() });
await browser.close();
console.log("done");
