// P10D — Screenshot generator for observed price block
// Requires: dev server running on port 3010

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE_URL = "http://localhost:3010";
const OUTPUT_DIR = path.join(__dirname, "../public/screenshots");
const LISTING_URL = "/listings/casablanca-finance-city-terrasse";
const MARKET_SECTION_TEXT = "Repère marché indicatif";

async function run() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  // Desktop screenshot
  const desktopCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const desktopPage = await desktopCtx.newPage();
  await desktopPage.goto(BASE_URL + LISTING_URL, { waitUntil: "networkidle" });

  try {
    await desktopPage.locator(`text=${MARKET_SECTION_TEXT}`).first().scrollIntoViewIfNeeded();
    await desktopPage.waitForTimeout(400);
  } catch (e) {
    await desktopPage.evaluate(() => window.scrollBy(0, 800));
    await desktopPage.waitForTimeout(300);
  }

  await desktopPage.screenshot({
    path: path.join(OUTPUT_DIR, "p10d-observed-price-desktop.png"),
    fullPage: false,
  });
  console.log("Saved: p10d-observed-price-desktop.png");
  await desktopCtx.close();

  // Mobile screenshot
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto(BASE_URL + LISTING_URL, { waitUntil: "networkidle" });

  try {
    const btn = mobilePage.locator(`button:has-text("${MARKET_SECTION_TEXT}")`).first();
    const exists = await btn.count();
    if (exists > 0) {
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      await mobilePage.waitForTimeout(400);
      await btn.scrollIntoViewIfNeeded();
      await mobilePage.waitForTimeout(200);
    } else {
      await mobilePage.evaluate(() => window.scrollBy(0, 800));
    }
  } catch (e) {
    await mobilePage.evaluate(() => window.scrollBy(0, 800));
  }

  await mobilePage.screenshot({
    path: path.join(OUTPUT_DIR, "p10d-observed-price-mobile.png"),
    fullPage: false,
  });
  console.log("Saved: p10d-observed-price-mobile.png");
  await mobileCtx.close();

  await browser.close();
  console.log("Screenshots done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
