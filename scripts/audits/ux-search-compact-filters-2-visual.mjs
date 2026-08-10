import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.UX_SEARCH_COMPACT_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = "data/audits/ux-search-compact-filters-2";
const route = "/search?city=Rabat&view=list";
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800, expectedColumns: 2 },
  { name: "mobile-390x844", width: 390, height: 844, expectedColumns: 2 },
  { name: "tablet-768x900", width: 768, height: 900, expectedColumns: 2 },
  { name: "desktop-1024x800", width: 1024, height: 800, expectedColumns: 3 },
  { name: "desktop-1280x800", width: 1280, height: 800, expectedColumns: 4 },
  { name: "desktop-1440x900", width: 1440, height: 900, expectedColumns: 4 },
];

const districts = ["Agdal", "Hay Riad", "Océan", "Hassan", "Souissi", "Agdal", "Hay Riad", "Océan"];
const propertyTypes = ["Appartement", "Villa", "Appartement", "Bureau", "Terrain", "Studio", "Maison", "Appartement"];
const listings = Array.from({ length: 8 }, (_, index) => ({
  id: `ux-search-compact-2-${index + 1}`,
  title: [
    "Appartement lumineux à Rabat",
    "Villa moderne avec jardin",
    "Appartement proche de la corniche",
    "Bureau central à Rabat",
    "Terrain résidentiel",
    "Studio compact à Agdal",
    "Maison familiale à Hay Riad",
    "Appartement avec terrasse",
  ][index],
  city: "Rabat",
  neighborhood: districts[index],
  price: 1450000 + index * 275000,
  currency: "DH",
  surface_m2: 72 + index * 18,
  price_per_m2: 16518,
  property_type: propertyTypes[index],
  transaction_type: "buy",
  bedrooms: index % 3 === 0 ? 3 : 2,
  bathrooms: index % 2 === 0 ? 2 : 1,
  freshness_label: "Récent",
  source_type: "Source analysée",
  reliability_label: "Informations complètes",
  reliability_score: 88,
  reliability_available: true,
  is_mre_friendly: false,
  description: "Fixture déterministe de certification UX-SEARCH-2.",
  image_url: "",
  reliability_explanation: "Fixture CI",
  data_completeness_score: 90,
  source_name: "AkarFinder",
  duplicate_score: 0.1,
  can_show_result: true,
  production_allowed: true,
  can_show_thumbnail: false,
  display_images: { policy: "no_listing_image", urls: [] },
  image_permission_status: "unknown",
  source_access_level: "indexed_only",
  acquisition_channel: "first_party_user",
  origin_type: "first_party_user",
}));

const rect = (element) => {
  if (!element) return null;
  const box = element.getBoundingClientRect();
  return {
    top: Math.round(box.top),
    left: Math.round(box.left),
    width: Math.round(box.width),
    height: Math.round(box.height),
    bottom: Math.round(box.bottom),
  };
};

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
let failure = null;

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.route("**/api/search?**", async (requestRoute) => {
      await requestRoute.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ listings, total: listings.length, limit: 100, offset: 0, source: "ux-search-compact-2-ci-fixture", generated_at: new Date().toISOString() }),
      });
    });
    await page.route("**/api/search/gateway?**", async (requestRoute) => {
      await requestRoute.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ results: [], total_count: 0, next_cursor: null, has_more: false }),
      });
    });

    try {
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      if (!response || response.status() >= 400) throw new Error(`${viewport.name}: route returned ${response?.status() ?? "no response"}`);
      await page.waitForFunction(() => document.querySelectorAll('article[data-property-active]').length >= 8, null, { timeout: 20_000 });
      await page.waitForTimeout(250);

      const metrics = await page.evaluate(() => {
        const box = (element) => {
          if (!element) return null;
          const r = element.getBoundingClientRect();
          return { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height), bottom: Math.round(r.bottom) };
        };
        const grid = document.querySelector('[data-search-continuous-flow] > div.grid');
        const cards = Array.from(document.querySelectorAll('article[data-property-active]'));
        const gridStyle = grid ? getComputedStyle(grid) : null;
        const columnTemplate = gridStyle?.gridTemplateColumns ?? "";
        const columnCount = columnTemplate ? columnTemplate.split(" ").filter(Boolean).length : 0;
        const cardRects = cards.slice(0, 8).map(box).filter(Boolean);
        const firstRowTop = cardRects[0]?.top ?? null;
        const firstRowCount = firstRowTop == null ? 0 : cardRects.filter((item) => Math.abs(item.top - firstRowTop) <= 2).length;
        const searchInput = document.querySelector('#property-search');
        const filterTrigger = document.querySelector('[data-search-filter-trigger]');
        const primaryRow = document.querySelector('[data-search-primary-filter-row]');
        const quickFilters = document.querySelector('[data-search-quick-filters]');
        const toolbar = document.querySelector('[data-search-results-toolbar]');
        const mobileView = document.querySelector('[data-search-mobile-view-select]');
        const desktopView = document.querySelector('[data-search-desktop-view-switcher]');
        const sort = document.querySelector('[data-search-sort-select]');
        const desktopTransactions = document.querySelector('[data-search-desktop-transaction-tabs]');
        const searchRect = box(searchInput);
        const filterRect = box(filterTrigger);
        const mobileViewRect = box(mobileView);
        const sortRect = box(sort);
        return {
          column_template: columnTemplate,
          column_count: columnCount,
          first_row_count: firstRowCount,
          first_card_top: cardRects[0]?.top ?? null,
          primary_row: box(primaryRow),
          quick_filters: box(quickFilters),
          results_toolbar: box(toolbar),
          search_input: searchRect,
          filter_trigger: filterRect,
          mobile_view: mobileViewRect,
          sort_select: sortRect,
          search_filter_same_row: Boolean(searchRect && filterRect && Math.abs(searchRect.top - filterRect.top) <= 2),
          desktop_transaction_display: desktopTransactions ? getComputedStyle(desktopTransactions).display : null,
          mobile_view_display: mobileView ? getComputedStyle(mobileView).display : null,
          desktop_view_display: desktopView ? getComputedStyle(desktopView).display : null,
          horizontal_overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          client_width: document.documentElement.clientWidth,
          scroll_width: document.documentElement.scrollWidth,
          view_mode: document.querySelector('[data-search-view-layout]')?.getAttribute('data-search-view-layout') ?? null,
        };
      });

      const measured = { name: viewport.name, expected_columns: viewport.expectedColumns, ...metrics };
      results.push(measured);
      await page.screenshot({ path: `${outputDir}/${viewport.name}.png`, fullPage: true });

      if (metrics.view_mode !== "list") throw new Error(`${viewport.name}: expected list view, got ${metrics.view_mode}`);
      if (metrics.horizontal_overflow) throw new Error(`${viewport.name}: horizontal overflow ${metrics.scroll_width}/${metrics.client_width}`);
      if (metrics.column_count !== viewport.expectedColumns || metrics.first_row_count !== viewport.expectedColumns) {
        throw new Error(`${viewport.name}: density regression ${metrics.column_count}/${metrics.first_row_count}, expected ${viewport.expectedColumns}`);
      }
      if (!metrics.search_filter_same_row) throw new Error(`${viewport.name}: primary search and filter trigger are not on one row`);
      if ((metrics.quick_filters?.height ?? 999) > 56) throw new Error(`${viewport.name}: closed quick filters too tall at ${metrics.quick_filters?.height}px`);
      if ((metrics.results_toolbar?.height ?? 999) > 62) throw new Error(`${viewport.name}: results toolbar too tall at ${metrics.results_toolbar?.height}px`);

      if (viewport.width < 640) {
        if (metrics.desktop_transaction_display !== "none") throw new Error(`${viewport.name}: desktop transaction tabs should be hidden`);
        if (metrics.mobile_view_display === "none") throw new Error(`${viewport.name}: compact mobile view selector missing`);
        for (const [name, target] of [["search", metrics.search_input], ["filter", metrics.filter_trigger], ["view", metrics.mobile_view], ["sort", metrics.sort_select]]) {
          if ((target?.height ?? 0) < 48) throw new Error(`${viewport.name}: ${name} touch target below 48px`);
        }
        if ((metrics.first_card_top ?? 999) > 305) throw new Error(`${viewport.name}: first result starts too low at ${metrics.first_card_top}px`);
      }

      if (viewport.width >= 1024) {
        if (metrics.desktop_transaction_display === "none") throw new Error(`${viewport.name}: desktop transaction tabs unexpectedly hidden`);
        if ((metrics.first_card_top ?? 999) > 270) throw new Error(`${viewport.name}: first result starts too low at ${metrics.first_card_top}px`);
      }
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

await writeFile(
  `${outputDir}/metrics.json`,
  `${JSON.stringify({ route, fixture_count: listings.length, generated_at: new Date().toISOString(), results, failure: failure instanceof Error ? failure.message : null }, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify(results, null, 2));
if (failure) throw failure;