import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

// Real-browser proof only: no mocked page, no production deployment.
const baseUrl = process.env.LOT7_VISUAL_BASE_URL || "http://127.0.0.1:3000";
const outDir = process.env.LOT7_VISUAL_OUTPUT || "artifacts/lot7-visual";
await mkdir(outDir, { recursive: true });

const expectedFamilies = ["apartment", "villa", "land", "office", "commercial", "riad"];

async function assertIndexedArtwork(page) {
  await page.getByText("Appartement premium à Casablanca").waitFor({ state: "visible", timeout: 30000 });
  const keys = await page.locator("[data-indexed-property-artwork]").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-indexed-property-artwork")).filter(Boolean),
  );
  for (const family of expectedFamilies) {
    if (!keys.includes(family)) {
      throw new Error(`lot7_missing_indexed_visual_family:${family}:${JSON.stringify(keys)}`);
    }
  }
  const indexedCardCount = await page.locator("[data-indexed-artwork-card='true']").count();
  if (indexedCardCount < expectedFamilies.length) {
    throw new Error(`lot7_expected_indexed_cards:${indexedCardCount}`);
  }
}

const browser = await chromium.launch({ headless: true });
try {
  const mixedUrl = `${baseUrl}/search?city=Casablanca`;
  const apartmentUrl = `${baseUrl}/search?city=Casablanca&property_type=Appartement`;

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  await desktop.goto(mixedUrl, { waitUntil: "networkidle", timeout: 120000 });
  await assertIndexedArtwork(desktop);
  await desktop.screenshot({ path: `${outDir}/lot7-search-property-types-desktop-1440.png`, fullPage: true });
  await desktop.goto(apartmentUrl, { waitUntil: "networkidle", timeout: 120000 });
  await desktop.getByText("Appartement premium à Casablanca").waitFor({ state: "visible", timeout: 30000 });
  if (await desktop.locator("[data-indexed-property-artwork='apartment']").count() < 1) {
    throw new Error("lot7_missing_apartment_indexed_artwork_desktop");
  }
  await desktop.screenshot({ path: `${outDir}/lot7-search-apartment-desktop-1440.png`, fullPage: true });
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await mobile.goto(mixedUrl, { waitUntil: "networkidle", timeout: 120000 });
  await assertIndexedArtwork(mobile);
  await mobile.screenshot({ path: `${outDir}/lot7-search-property-types-mobile-390.png`, fullPage: true });
  await mobile.goto(apartmentUrl, { waitUntil: "networkidle", timeout: 120000 });
  await mobile.getByText("Appartement premium à Casablanca").waitFor({ state: "visible", timeout: 30000 });
  if (await mobile.locator("[data-indexed-property-artwork='apartment']").count() < 1) {
    throw new Error("lot7_missing_apartment_indexed_artwork_mobile");
  }
  await mobile.screenshot({ path: `${outDir}/lot7-search-apartment-mobile-390.png`, fullPage: true });
  await mobile.close();

  console.log(JSON.stringify({
    mixedUrl,
    apartmentUrl,
    expectedFamilies,
    screenshots: [
      "lot7-search-property-types-desktop-1440.png",
      "lot7-search-property-types-mobile-390.png",
      "lot7-search-apartment-desktop-1440.png",
      "lot7-search-apartment-mobile-390.png",
    ],
  }));
} finally {
  await browser.close();
}
