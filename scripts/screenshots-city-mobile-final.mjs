import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3109";
const OUT = "public/screenshots/city-mobile-final";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

// Mobile — viewport 390×844
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(2000);
await page.evaluate(() => {
  const el = document.getElementById("villes");
  if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
});
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/mobile-villes-top.png`, fullPage: false });
console.log("✓ mobile-villes-top");

// Scroll mi-image pour voir les 5 cartes
await page.evaluate(() => { window.scrollBy(0, 400); });
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/mobile-villes-mid.png`, fullPage: false });
console.log("✓ mobile-villes-mid");

// Scroll bas pour voir Agadir + bouton
await page.evaluate(() => { window.scrollBy(0, 500); });
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/mobile-villes-bottom.png`, fullPage: false });
console.log("✓ mobile-villes-bottom");
await ctx.close();

// Desktop — vérif pas de régression
const ctxD = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const pageD = await ctxD.newPage();
await pageD.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 30000 });
await pageD.waitForTimeout(2000);
await pageD.evaluate(() => {
  const el = document.getElementById("villes");
  if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
});
await pageD.waitForTimeout(800);
await pageD.screenshot({ path: `${OUT}/desktop-villes.png`, fullPage: false });
console.log("✓ desktop-villes");
await ctxD.close();

await browser.close();
console.log("Done.");
