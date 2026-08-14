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

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
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
      await requestRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: [], total_count: 0, next_cursor: null, has_more: false }) });
    });

    try {
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      assert(response && response.status() < 400, `${viewport.name}: route returned ${response?.status() ?? "no response"}`);
      await page.waitForFunction(() => document.querySelectorAll("article[data-property-active]").length >= 8, null, { timeout: 20_000 });
      await page.waitForTimeout(250);

      const metrics = await page.evaluate(() => {
        const box = (element) => {
          if (!element) return null;
          const r = element.getBoundingClientRect();
          return { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height), bottom: Math.round(r.bottom) };
        };
        const grid = document.querySelector("[data-search-continuous-flow] > div.grid");
        const cards = Array.from(document.querySelectorAll("article[data-property-active]"));
        const columnTemplate = grid ? getComputedStyle(grid).gridTemplateColumns : "";
        const cardRects = cards.slice(0, 8).map(box).filter(Boolean);
        const firstRowTop = cardRects[0]?.top ?? null;
        const searchInput = document.querySelector("#property-search");
        const filterTrigger = document.querySelector("[data-search-filter-trigger]");
        const primaryRow = document.querySelector("[data-search-primary-filter-row]");
        const quickFilters = document.querySelector("[data-premium-quickfilters-row]");
        const toolbar = document.querySelector("[data-search-results-toolbar]");
        const mobileView = document.querySelector("[data-search-mobile-view-select]");
        const desktopView = document.querySelector("[data-search-desktop-view-switcher]");
        const sort = document.querySelector("[data-search-sort-select]");
        const desktopTransactions = document.querySelector("[data-search-desktop-transaction-tabs]");
        const searchRect = box(searchInput);
        const filterRect = box(filterTrigger);
        return {
          column_count: columnTemplate ? columnTemplate.split(" ").filter(Boolean).length : 0,
          first_row_count: firstRowTop == null ? 0 : cardRects.filter((item) => Math.abs(item.top - firstRowTop) <= 2).length,
          first_card_top: cardRects[0]?.top ?? null,
          primary_row: box(primaryRow),
          quick_filters: box(quickFilters),
          results_toolbar: box(toolbar),
          search_input: searchRect,
          filter_trigger: filterRect,
          mobile_view: box(mobileView),
          sort_select: box(sort),
          search_filter_same_row: Boolean(searchRect && filterRect && Math.abs(searchRect.top - filterRect.top) <= 2),
          desktop_transaction_display: desktopTransactions ? getComputedStyle(desktopTransactions).display : null,
          mobile_view_display: mobileView ? getComputedStyle(mobileView).display : null,
          desktop_view_display: desktopView ? getComputedStyle(desktopView).display : null,
          horizontal_overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          client_width: document.documentElement.clientWidth,
          scroll_width: document.documentElement.scrollWidth,
          view_mode: document.querySelector("[data-search-view-layout]")?.getAttribute("data-search-view-layout") ?? null,
        };
      });

      results.push({ name: viewport.name, expected_columns: viewport.expectedColumns, ...metrics });
      await page.screenshot({ path: `${outputDir}/${viewport.name}.png`, fullPage: true });

      assert(metrics.view_mode === "list", `${viewport.name}: expected list view, got ${metrics.view_mode}`);
      assert(!metrics.horizontal_overflow, `${viewport.name}: horizontal overflow ${metrics.scroll_width}/${metrics.client_width}`);
      assert(metrics.column_count === viewport.expectedColumns && metrics.first_row_count === viewport.expectedColumns, `${viewport.name}: density regression ${metrics.column_count}/${metrics.first_row_count}, expected ${viewport.expectedColumns}`);
      assert(metrics.search_filter_same_row, `${viewport.name}: primary search and filter trigger are not on one row`);
      assert((metrics.quick_filters?.height ?? 999) <= 56, `${viewport.name}: premium quick-filter row too tall at ${metrics.quick_filters?.height}px`);
      assert((metrics.results_toolbar?.height ?? 999) <= 62, `${viewport.name}: results toolbar too tall at ${metrics.results_toolbar?.height}px`);

      if (viewport.width < 640) {
        assert(metrics.desktop_transaction_display === "none", `${viewport.name}: desktop transaction tabs should be hidden`);
        assert(metrics.mobile_view_display === "none", `${viewport.name}: legacy mobile view selector should stay hidden in final Search baseline`);
        assert(metrics.desktop_view_display === "none", `${viewport.name}: desktop view switcher should be hidden`);
        for (const [name, target] of [["search", metrics.search_input], ["filter", metrics.filter_trigger]]) {
          assert((target?.height ?? 0) >= 48, `${viewport.name}: ${name} touch target below 48px`);
        }
        assert((metrics.sort_select?.height ?? 0) >= 43.5, `${viewport.name}: sort touch target below final 44px contract`);
        assert((metrics.first_card_top ?? 999) <= 305, `${viewport.name}: first result starts too low at ${metrics.first_card_top}px`);
      }

      if (viewport.width >= 1024) {
        assert(metrics.desktop_transaction_display !== "none", `${viewport.name}: desktop transaction tabs unexpectedly hidden`);
        assert((metrics.first_card_top ?? 999) <= 270, `${viewport.name}: first result starts too low at ${metrics.first_card_top}px`);
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

await writeFile(`${outputDir}/metrics.json`, `${JSON.stringify({ route, fixture_count: listings.length, generated_at: new Date().toISOString(), results, failure: failure instanceof Error ? failure.message : null }, null, 2)}\n`, "utf8");
console.log(JSON.stringify(results, null, 2));
if (failure) throw failure;
