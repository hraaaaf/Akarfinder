// P11D-C screenshots: visit request panel on listing page
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:3101";
const OUT = "public/screenshots";
mkdirSync(OUT, { recursive: true });

async function save(page, name) {
  const buf = await page.screenshot({ fullPage: true });
  writeFileSync(join(OUT, name), buf);
  console.log("✓", name);
}

// Find a listing id from the API
const res = await fetch(`${BASE}/api/listings?limit=1`);
const json = await res.json();
const listingId = json.listings?.[0]?.id ?? "1";
console.log("Using listing:", listingId);

const browser = await chromium.launch();

// ── Desktop: listing page with visit request panel visible ──
const desk = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const deskPage = await desk.newPage();
await deskPage.goto(`${BASE}/listings/${listingId}`, { waitUntil: "networkidle" });
await deskPage.waitForTimeout(800);
// Scroll to the visit request panel / sidebar CTA
await deskPage.evaluate(() => {
  const el = document.querySelector('[aria-expanded]') ||
             document.querySelector('button:has-text("Demander une visite")');
  if (el) el.scrollIntoView({ behavior: "instant", block: "center" });
});
await deskPage.waitForTimeout(400);
await save(deskPage, "p11dc-listing-visit-panel-desktop.png");

// ── Desktop: open the visit form ──
const btn = deskPage.getByRole("button", { name: /Demander une visite/ }).first();
await btn.click();
await deskPage.waitForTimeout(500);
await save(deskPage, "p11dc-visit-form-open-desktop.png");

// ── Mobile: listing page ──
const mob = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mobPage = await mob.newPage();
await mobPage.goto(`${BASE}/listings/${listingId}`, { waitUntil: "networkidle" });
await mobPage.waitForTimeout(800);
await save(mobPage, "p11dc-listing-visit-panel-mobile.png");

await browser.close();
console.log("\nDone.");
