import { chromium } from "playwright";

const browser = await chromium.launch();

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: "public/screenshots/hotfix-hero-local-desktop.png", fullPage: false });

const h1 = await page.textContent("h1");
console.log("H1:", h1);

const heroSection = await page.locator("section#recherche").textContent();
console.log("Hero text (first 500):", heroSection?.substring(0, 500));

const forbidden = ["officiel", "garanti", "certifié", "données vérifiées", "annonces certifiées", "fiable à 100", "annonces validées"];
for (const f of forbidden) {
  if (heroSection?.toLowerCase().includes(f.toLowerCase())) {
    console.log("FORBIDDEN found:", f);
  }
}
console.log("Forbidden word check: done");

// Mobile
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: "public/screenshots/hotfix-hero-local-mobile.png", fullPage: false });
const mobileH1 = await page.textContent("h1");
console.log("Mobile H1:", mobileH1);

// Full page screenshots
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1000);
await page.screenshot({ path: "public/screenshots/hotfix-hero-local-desktop-full.png", fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1000);
await page.screenshot({ path: "public/screenshots/hotfix-hero-local-mobile-full.png", fullPage: true });

await browser.close();
console.log("All screenshots captured.");
