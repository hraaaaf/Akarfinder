// Screenshot generator for P10B-REAL MapLibre map
// Run from project root: node scripts/screenshot-map.js

const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = 'http://localhost:3008';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'public', 'screenshots');
const WAIT_MS = 4000;

async function run() {
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Desktop Morocco overview
    {
      const page = await browser.newPage();
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`${BASE_URL}/map`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(WAIT_MS);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'p10b-real-map-desktop.png') });
      console.log('✓ p10b-real-map-desktop.png');
      await page.close();
    }

    // 2. Mobile Morocco overview
    {
      const page = await browser.newPage();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${BASE_URL}/map`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(WAIT_MS);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'p10b-real-map-mobile.png') });
      console.log('✓ p10b-real-map-mobile.png');
      await page.close();
    }

    // 3. Desktop with Casablanca filtered (triggers flyTo + individual markers)
    {
      const page = await browser.newPage();
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`${BASE_URL}/map?city=Casablanca`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(WAIT_MS + 1000);
      // Click first listing in side panel to select it
      const firstCard = page.locator('aside button').first();
      const visible = await firstCard.isVisible().catch(() => false);
      if (visible) {
        await firstCard.click();
        await page.waitForTimeout(1200);
      }
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'p10b-real-map-selected-desktop.png') });
      console.log('✓ p10b-real-map-selected-desktop.png');
      await page.close();
    }

    // 4. Mobile with bottom sheet
    {
      const page = await browser.newPage();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${BASE_URL}/map?city=Casablanca`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(WAIT_MS + 1000);
      // Try clicking a price marker
      const priceMarker = page.locator('.maplibre-price-marker').first();
      const markerVisible = await priceMarker.isVisible({ timeout: 3000 }).catch(() => false);
      if (markerVisible) {
        await priceMarker.click();
        await page.waitForTimeout(800);
        // Expand bottom sheet by clicking drag handle area
        const dragHandle = page.locator('[aria-label="Voir plus"]').first();
        const dragVisible = await dragHandle.isVisible().catch(() => false);
        if (dragVisible) {
          await dragHandle.click();
          await page.waitForTimeout(500);
        }
      }
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'p10b-real-map-selected-mobile.png') });
      console.log('✓ p10b-real-map-selected-mobile.png');
      await page.close();
    }

    console.log('All screenshots generated.');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
