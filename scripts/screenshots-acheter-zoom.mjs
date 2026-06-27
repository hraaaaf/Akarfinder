import { chromium } from "playwright";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();
await page.goto("http://localhost:3000/acheter", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1000);

// Screenshot du viewport visible uniquement (pas fullPage) — montre le hero
await page.screenshot({ path: "public/screenshots/intent-relooking-acheter/hero-viewport.png", fullPage: false });

// Mobile viewport
await ctx.close();
const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 } });
const pageM = await ctxM.newPage();
await pageM.goto("http://localhost:3000/acheter", { waitUntil: "networkidle", timeout: 30000 });
await pageM.waitForTimeout(1000);
await pageM.screenshot({ path: "public/screenshots/intent-relooking-acheter/hero-mobile-viewport.png", fullPage: false });
await ctxM.close();

await browser.close();
console.log("Done");
