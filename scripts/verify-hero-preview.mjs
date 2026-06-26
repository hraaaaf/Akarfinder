import { chromium } from "playwright";

const PREVIEW = "https://akarfinder-9pq97dszg-achraf-benmoussa-s-projects.vercel.app/";

const browser = await chromium.launch();

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(PREVIEW, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: "public/screenshots/hotfix-hero-preview-desktop.png", fullPage: false });

const h1 = await page.textContent("h1");
console.log("H1:", h1);

const heroSection = await page.locator("section#recherche").textContent();
console.log("Hero section text:", heroSection?.substring(0, 500));

// Check for forbidden wording in hero
const forbidden = ["officiel", "garanti", "certifié", "données vérifiées", "annonces certifiées"];
for (const f of forbidden) {
  if (heroSection?.toLowerCase().includes(f.toLowerCase())) {
    console.log("FORBIDDEN:", f);
  }
}
console.log("Forbidden check done.");

// Mobile
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(PREVIEW, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: "public/screenshots/hotfix-hero-preview-mobile.png", fullPage: false });
const mobileH1 = await page.textContent("h1");
console.log("Mobile H1:", mobileH1);

await browser.close();
console.log("Done.");
