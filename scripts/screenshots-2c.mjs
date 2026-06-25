import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto("http://localhost:3002/search", { waitUntil: "load", timeout: 30000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: "public/screenshots/level-2c-search-desktop.png", fullPage: true });
console.log("search desktop done");

await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://localhost:3002/search", { waitUntil: "load", timeout: 30000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: "public/screenshots/level-2c-search-mobile.png", fullPage: true });
console.log("search mobile done");

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto("http://localhost:3002/listings/casablanca-finance-city-terrasse", { waitUntil: "load", timeout: 30000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: "public/screenshots/level-2c-detail-desktop.png", fullPage: true });
console.log("detail desktop done");

await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://localhost:3002/listings/casablanca-finance-city-terrasse", { waitUntil: "load", timeout: 30000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: "public/screenshots/level-2c-detail-mobile.png", fullPage: true });
console.log("detail mobile done");

await browser.close();
console.log("all done");
