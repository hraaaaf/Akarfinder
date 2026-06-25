// P10E-FINAL — Screenshot QA pass
// Requires: dev server running on port 3010

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE_URL = "http://localhost:3010";
const OUTPUT_DIR = path.join(__dirname, "../public/screenshots");
const LISTING_URL = "/listings/casablanca-finance-city-terrasse";
const SEARCH_URL = "/search";

async function run() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  // 1. Desktop — listing detail (Package Score block visible on desktop always)
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL + LISTING_URL, { waitUntil: "networkidle" });
    try {
      await page.locator("text=Package AkarFinder").first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
    } catch {
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, "p10e-package-score-desktop.png") });
    console.log("Saved: p10e-package-score-desktop.png");
    await ctx.close();
  }

  // 2. Mobile — listing detail (open Package accordion)
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL + LISTING_URL, { waitUntil: "networkidle" });
    try {
      const btn = page.locator('button:has-text("Package AkarFinder")').first();
      if (await btn.count() > 0) {
        await btn.scrollIntoViewIfNeeded();
        await btn.click();
        await page.waitForTimeout(400);
        await btn.scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
      } else {
        await page.evaluate(() => window.scrollBy(0, 600));
        await page.waitForTimeout(300);
      }
    } catch {
      await page.evaluate(() => window.scrollBy(0, 600));
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, "p10e-package-score-mobile.png") });
    console.log("Saved: p10e-package-score-mobile.png");
    await ctx.close();
  }

  // 3. Cards — desktop search with package badges visible
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL + SEARCH_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUTPUT_DIR, "p10e-package-card-badge.png") });
    console.log("Saved: p10e-package-card-badge.png");
    await ctx.close();
  }

  // 4. Filter state — "Bon package" active on search page
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL + SEARCH_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    // Open filters on desktop (they're always visible on lg)
    // Click the "Bon package" toggle
    try {
      const btn = page.locator('button:has-text("Bon package")').first();
      if (await btn.count() > 0) {
        await btn.scrollIntoViewIfNeeded();
        await btn.click();
        await page.waitForTimeout(600);
      }
    } catch {
      // ignore; screenshot anyway
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, "p10e-package-filter-search.png") });
    console.log("Saved: p10e-package-filter-search.png");
    await ctx.close();
  }

  await browser.close();
  console.log("All screenshots done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
