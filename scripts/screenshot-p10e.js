// P10E — Screenshot generator for Package Score block
// Requires: dev server running on port 3010

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE_URL = "http://localhost:3010";
const OUTPUT_DIR = path.join(__dirname, "../public/screenshots");
const LISTING_URL = "/listings/casablanca-finance-city-terrasse";
const SEARCH_URL = "/search";
const PACKAGE_SECTION = "Package AkarFinder";

async function run() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  // Desktop — listing detail with Package Score block
  const desktopCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const desktopPage = await desktopCtx.newPage();
  await desktopPage.goto(BASE_URL + LISTING_URL, { waitUntil: "networkidle" });

  try {
    await desktopPage.locator(`text=${PACKAGE_SECTION}`).first().scrollIntoViewIfNeeded();
    await desktopPage.waitForTimeout(400);
  } catch {
    await desktopPage.evaluate(() => window.scrollBy(0, 600));
    await desktopPage.waitForTimeout(300);
  }

  await desktopPage.screenshot({
    path: path.join(OUTPUT_DIR, "p10e-package-score-desktop.png"),
    fullPage: false,
  });
  console.log("Saved: p10e-package-score-desktop.png");
  await desktopCtx.close();

  // Mobile — listing detail Package Score accordion
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto(BASE_URL + LISTING_URL, { waitUntil: "networkidle" });

  try {
    const btn = mobilePage.locator(`button:has-text("${PACKAGE_SECTION}")`).first();
    const exists = await btn.count();
    if (exists > 0) {
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      await mobilePage.waitForTimeout(400);
      await btn.scrollIntoViewIfNeeded();
      await mobilePage.waitForTimeout(200);
    } else {
      await mobilePage.evaluate(() => window.scrollBy(0, 600));
    }
  } catch {
    await mobilePage.evaluate(() => window.scrollBy(0, 600));
  }

  await mobilePage.screenshot({
    path: path.join(OUTPUT_DIR, "p10e-package-score-mobile.png"),
    fullPage: false,
  });
  console.log("Saved: p10e-package-score-mobile.png");
  await mobileCtx.close();

  // Card badge — search page
  const cardCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const cardPage = await cardCtx.newPage();
  await cardPage.goto(BASE_URL + SEARCH_URL, { waitUntil: "networkidle" });
  await cardPage.waitForTimeout(600);

  await cardPage.screenshot({
    path: path.join(OUTPUT_DIR, "p10e-package-card-badge.png"),
    fullPage: false,
  });
  console.log("Saved: p10e-package-card-badge.png");
  await cardCtx.close();

  await browser.close();
  console.log("Screenshots done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
