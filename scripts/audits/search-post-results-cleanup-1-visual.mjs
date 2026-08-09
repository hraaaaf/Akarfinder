import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.SEARCH_POST_RESULTS_CLEANUP_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = "data/audits/search-post-results-cleanup-1";
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "tablet-768x900", width: 768, height: 900 },
  { name: "desktop-1280x900", width: 1280, height: 900 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
];

const baseListing = {
  city: "Rabat",
  neighborhood: "Agdal",
  district: "Agdal",
  price: 1850000,
  currency: "DH",
  surface_m2: 112,
  price_per_m2: 16518,
  property_type: "Appartement",
  transaction_type: "buy",
  bedrooms: 3,
  bathrooms: 2,
  freshness_label: "Récent",
  reliability_label: "Informations complètes",
  reliability_score: 88,
  reliability_available: true,
  is_mre_friendly: false,
  description: "Fixture déterministe post-results cleanup.",
  image_url: "",
  reliability_explanation: "Fixture CI",
  data_completeness_score: 90,
  duplicate_score: 0.1,
  can_show_result: true,
  production_allowed: true,
  can_show_thumbnail: false,
  display_images: { policy: "no_listing_image", urls: [] },
  image_permission_status: "unknown",
  source_name: "AkarFinder",
  source_type: "Particulier",
  acquisition_channel: "first_party_user",
  origin_type: "first_party_user",
  original_source_required: false,
  can_show_contact: true,
};

const listings = [1, 2, 3, 4].map((index) => ({
  ...baseListing,
  id: `post-results-${index}`,
  title: `${index.toString().padStart(2, "0")} Appartement test Agdal`,
  price: 1850000 + index * 10000,
}));

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
let failure = null;

async function installRoutes(page) {
  await page.route("**/api/search?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ listings, total: listings.length, limit: 100, offset: 0, source: "post-results-cleanup-ci", generated_at: new Date().toISOString() }),
    });
  });
  await page.route("**/api/search/gateway?**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: [], total_count: 0, next_cursor: null, has_more: false }) });
  });
}

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await installRoutes(page);
    try {
      const general = await page.goto(`${baseUrl}/search?q=appartement&view=split`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      if (!general || general.status() >= 400) throw new Error(`${viewport.name}: general search returned ${general?.status() ?? "no response"}`);
      await page.waitForSelector('[data-search-view-layout="split"]', { timeout: 20_000 });
      await page.waitForSelector('[data-search-list-pane] [data-mobile-compact-card]', { timeout: 20_000 });
      await page.waitForSelector('[data-search-map-pane]', { state: "visible", timeout: 20_000 });
      await page.waitForTimeout(250);

      const generalMetrics = await page.evaluate(() => {
        const secondaries = [...document.querySelectorAll('[data-search-map-secondary]')];
        const visibleSecondaryCount = secondaries.filter((node) => {
          const style = getComputedStyle(node);
          return style.display !== "none" && style.visibility !== "hidden" && node.getClientRects().length > 0;
        }).length;
        const dock = document.querySelector('section[aria-label="Explorateur local synchronisé"]');
        const mapNeighborhoodDock = document.querySelector('[aria-label="Exploration ville et quartier"]');
        const firstPrice = document.querySelector('[data-search-list-pane] [data-mobile-price]');
        return {
          visibleSecondaryCount,
          emptyDockVisible: Boolean(dock && getComputedStyle(dock).display !== "none" && dock.getClientRects().length > 0),
          emptyMapNeighborhoodDockVisible: Boolean(mapNeighborhoodDock && getComputedStyle(mapNeighborhoodDock).display !== "none" && mapNeighborhoodDock.getClientRects().length > 0),
          clippedPrice: Boolean(firstPrice && firstPrice.scrollWidth > firstPrice.clientWidth + 1),
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          pageHeight: document.documentElement.scrollHeight,
        };
      });

      if (generalMetrics.visibleSecondaryCount !== 0) throw new Error(`${viewport.name}: split shows ${generalMetrics.visibleSecondaryCount} secondary map blocks`);
      if (generalMetrics.emptyDockVisible) throw new Error(`${viewport.name}: empty post-results intelligence dock is visible`);
      if (generalMetrics.emptyMapNeighborhoodDockVisible) throw new Error(`${viewport.name}: empty map neighborhood dock is visible`);
      if (generalMetrics.scrollWidth > generalMetrics.clientWidth) throw new Error(`${viewport.name}: horizontal overflow ${generalMetrics.scrollWidth}/${generalMetrics.clientWidth}`);
      if (generalMetrics.clippedPrice) throw new Error(`${viewport.name}: first price is truncated`);

      await page.screenshot({ path: `${outputDir}/${viewport.name}-general.png`, fullPage: true });

      const useful = await page.goto(`${baseUrl}/search?q=appartement&view=split&city=Rabat&property_type=Appartement&transaction_type=buy`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      if (!useful || useful.status() >= 400) throw new Error(`${viewport.name}: useful search returned ${useful?.status() ?? "no response"}`);
      await page.waitForSelector('[data-search-list-pane] [data-mobile-compact-card]', { timeout: 20_000 });
      await page.waitForSelector('section[aria-label="Explorateur local synchronisé"]', { state: "visible", timeout: 20_000 });
      await page.waitForSelector('[aria-label="Exploration ville et quartier"]', { state: "visible", timeout: 20_000 });
      await page.waitForTimeout(250);

      const usefulMetrics = await page.evaluate(() => ({
        dockVisible: Boolean(document.querySelector('section[aria-label="Explorateur local synchronisé"]')),
        mapNeighborhoodDockVisible: Boolean(document.querySelector('[aria-label="Exploration ville et quartier"]')),
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      if (!usefulMetrics.dockVisible) throw new Error(`${viewport.name}: useful local intelligence did not reappear`);
      if (!usefulMetrics.mapNeighborhoodDockVisible) throw new Error(`${viewport.name}: useful map neighborhood intelligence did not reappear`);
      if (usefulMetrics.scrollWidth > usefulMetrics.clientWidth) throw new Error(`${viewport.name}: useful context horizontal overflow ${usefulMetrics.scrollWidth}/${usefulMetrics.clientWidth}`);

      await page.screenshot({ path: `${outputDir}/${viewport.name}-useful.png`, fullPage: true });
      results.push({
        name: viewport.name,
        split_secondary_blocks_visible: generalMetrics.visibleSecondaryCount,
        empty_dock_visible: generalMetrics.emptyDockVisible,
        empty_map_neighborhood_dock_visible: generalMetrics.emptyMapNeighborhoodDockVisible,
        useful_dock_visible: usefulMetrics.dockVisible,
        useful_map_neighborhood_dock_visible: usefulMetrics.mapNeighborhoodDockVisible,
        general_page_height: generalMetrics.pageHeight,
        horizontal_overflow: false,
        truncated_price: generalMetrics.clippedPrice,
      });
    } catch (error) {
      failure = error;
      break;
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

await writeFile(`${outputDir}/metrics.json`, `${JSON.stringify({ generated_at: new Date().toISOString(), results, failure: failure instanceof Error ? failure.message : null }, null, 2)}\n`, "utf8");
console.log(JSON.stringify(results, null, 2));
if (failure) throw failure;
