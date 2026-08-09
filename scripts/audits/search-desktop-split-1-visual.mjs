import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.SEARCH_DESKTOP_SPLIT_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = "data/audits/search-desktop-split-1";
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
  description: "Fixture déterministe desktop split.",
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
  id: `desktop-split-${index}`,
  title: `${index.toString().padStart(2, "0")} Appartement test Agdal`,
  price: 1850000 + index * 10000,
}));

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
let failure = null;

function visible(node) {
  if (!node) return false;
  const style = getComputedStyle(node);
  return style.display !== "none" && style.visibility !== "hidden" && Number.parseFloat(style.opacity || "1") > 0 && node.getClientRects().length > 0;
}

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.route("**/api/search?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ listings, total: listings.length, limit: 100, offset: 0, source: "desktop-split-ci", generated_at: new Date().toISOString() }),
      });
    });
    await page.route("**/api/search/gateway?**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: [], total_count: 0, next_cursor: null, has_more: false }) });
    });

    try {
      const response = await page.goto(`${baseUrl}/search?q=appartement%20rabat`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      if (!response || response.status() >= 400) throw new Error(`${viewport.name}: search returned ${response?.status() ?? "no response"}`);
      await page.waitForSelector('[data-search-view-layout="split"]', { timeout: 20_000 });
      await page.waitForSelector('[data-search-list-pane] [data-mobile-compact-card]', { timeout: 20_000 });
      await page.waitForSelector('[data-search-map-pane] aside', { timeout: 20_000 });

      const split = await page.evaluate(() => {
        const layout = document.querySelector('[data-search-view-layout="split"]');
        const list = document.querySelector('[data-search-list-pane]');
        const map = document.querySelector('[data-search-map-pane]');
        const firstCard = document.querySelector('[data-search-list-pane] [data-mobile-compact-card]');
        const firstPrice = firstCard?.querySelector('[data-mobile-price]');
        const listRect = list?.getBoundingClientRect();
        const mapRect = map?.getBoundingClientRect();
        const firstRect = firstCard?.getBoundingClientRect();
        const secondaries = [...document.querySelectorAll('[data-search-map-secondary]')];
        const visibleSecondaryCount = secondaries.filter((node) => {
          const style = getComputedStyle(node);
          return style.display !== "none" && style.visibility !== "hidden" && node.getClientRects().length > 0;
        }).length;
        return {
          layoutFound: Boolean(layout),
          listWidth: listRect ? Math.round(listRect.width) : null,
          mapWidth: mapRect ? Math.round(mapRect.width) : null,
          sameRow: Boolean(listRect && mapRect && Math.abs(listRect.top - mapRect.top) <= 3),
          stacked: Boolean(listRect && mapRect && mapRect.top > listRect.top + 40),
          firstCardVisible: Boolean(firstRect && firstRect.top < window.innerHeight),
          visibleSecondaryCount,
          clippedPrice: Boolean(firstPrice && firstPrice.scrollWidth > firstPrice.clientWidth + 1),
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      const overflow = split.scrollWidth > split.clientWidth;
      if (!split.layoutFound) throw new Error(`${viewport.name}: split layout marker missing`);
      if (!split.firstCardVisible) throw new Error(`${viewport.name}: first result not visible`);
      if (overflow) throw new Error(`${viewport.name}: horizontal overflow ${split.scrollWidth}/${split.clientWidth}`);
      if (split.clippedPrice) throw new Error(`${viewport.name}: first price is truncated`);

      if (viewport.width >= 1024) {
        if (!split.sameRow) throw new Error(`${viewport.name}: list and map are not aligned side-by-side`);
        if ((split.listWidth ?? 0) < viewport.width * 0.45) throw new Error(`${viewport.name}: list pane too narrow (${split.listWidth}px)`);
        if ((split.mapWidth ?? 0) < viewport.width * 0.34) throw new Error(`${viewport.name}: map pane too narrow (${split.mapWidth}px)`);
        if (split.visibleSecondaryCount !== 0) throw new Error(`${viewport.name}: split still shows ${split.visibleSecondaryCount} secondary map blocks`);

        await page.getByRole("button", { name: "Liste" }).click();
        await page.waitForSelector('[data-search-view-layout="list"]');
        const listOnly = await page.evaluate(() => ({
          list: Boolean(document.querySelector('[data-search-list-pane]')),
          map: Boolean(document.querySelector('[data-search-map-pane]')),
        }));
        if (!listOnly.list || listOnly.map) throw new Error(`${viewport.name}: Liste mode contract changed`);

        await page.getByRole("button", { name: "Carte" }).click();
        await page.waitForSelector('[data-search-view-layout="map"]');
        const mapOnly = await page.evaluate(() => {
          const list = document.querySelector('[data-search-list-pane]');
          const map = document.querySelector('[data-search-map-pane]');
          const secondaries = [...document.querySelectorAll('[data-search-map-secondary]')];
          const visibleSecondaryCount = secondaries.filter((node) => {
            const style = getComputedStyle(node);
            return style.display !== "none" && style.visibility !== "hidden" && node.getClientRects().length > 0;
          }).length;
          return { list: Boolean(list), map: Boolean(map), visibleSecondaryCount };
        });
        if (mapOnly.list || !mapOnly.map || mapOnly.visibleSecondaryCount !== 2) throw new Error(`${viewport.name}: Carte mode contract changed`);

        await page.getByRole("button", { name: "Mixte" }).click();
        await page.waitForSelector('[data-search-view-layout="split"]');
      } else {
        if (!split.stacked) throw new Error(`${viewport.name}: non-desktop split stacking changed`);
        if (split.visibleSecondaryCount !== 2) throw new Error(`${viewport.name}: mobile/tablet secondary content changed`);
      }

      await page.screenshot({ path: `${outputDir}/${viewport.name}.png`, fullPage: true });
      results.push({
        name: viewport.name,
        list_width: split.listWidth,
        map_width: split.mapWidth,
        desktop_side_by_side: viewport.width >= 1024 ? split.sameRow : null,
        non_desktop_stacked: viewport.width < 1024 ? split.stacked : null,
        split_secondary_blocks_visible: split.visibleSecondaryCount,
        horizontal_overflow: overflow,
        truncated_price: split.clippedPrice,
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
