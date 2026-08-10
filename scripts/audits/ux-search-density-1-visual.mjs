import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.UX_SEARCH_DENSITY_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = "data/audits/ux-search-density-1";
const route = "/search?city=Rabat&view=list";
const viewports = [
  { name: "mobile-390x844", width: 390, height: 844, expectedColumns: 2 },
  { name: "tablet-768x900", width: 768, height: 900, expectedColumns: 2 },
  { name: "desktop-1024x800", width: 1024, height: 800, expectedColumns: 3 },
  { name: "desktop-1280x800", width: 1280, height: 800, expectedColumns: 4 },
  { name: "desktop-1440x900", width: 1440, height: 900, expectedColumns: 4 },
];

const districts = ["Agdal", "Hay Riad", "Océan", "Hassan", "Souissi", "Agdal", "Hay Riad", "Océan"];
const propertyTypes = ["Appartement", "Villa", "Appartement", "Bureau", "Terrain", "Studio", "Maison", "Appartement"];

const listings = Array.from({ length: 8 }, (_, index) => ({
  id: `ux-search-density-1-${index + 1}`,
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
  description: "Fixture déterministe de certification densité UX.",
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
        body: JSON.stringify({
          listings,
          total: listings.length,
          limit: 100,
          offset: 0,
          source: "ux-search-density-1-ci-fixture",
          generated_at: new Date().toISOString(),
        }),
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
      if (!response || response.status() >= 400) {
        throw new Error(`${viewport.name}: search route returned ${response?.status() ?? "no response"}`);
      }

      await page.waitForFunction(() => document.querySelectorAll('article[data-property-active]').length >= 8, null, { timeout: 20_000 });
      await page.waitForTimeout(250);

      const metrics = await page.evaluate(() => {
        const grid = document.querySelector('[data-search-continuous-flow] > div.grid');
        const cards = Array.from(document.querySelectorAll('article[data-property-active]'));
        const gridStyle = grid ? getComputedStyle(grid) : null;
        const columnTemplate = gridStyle?.gridTemplateColumns ?? "";
        const columnCount = columnTemplate ? columnTemplate.split(" ").filter(Boolean).length : 0;
        const cardRects = cards.slice(0, 8).map((card) => {
          const rect = card.getBoundingClientRect();
          return {
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            bottom: Math.round(rect.bottom),
          };
        });
        const firstRowTop = cardRects[0]?.top ?? null;
        const firstRowCount = firstRowTop == null ? 0 : cardRects.filter((rect) => Math.abs(rect.top - firstRowTop) <= 2).length;
        const secondRow = firstRowTop == null ? [] : cardRects.filter((rect) => rect.top > firstRowTop + 2);
        const secondRowTop = secondRow.length > 0 ? Math.min(...secondRow.map((rect) => rect.top)) : null;
        return {
          column_template: columnTemplate,
          column_count: columnCount,
          first_row_count: firstRowCount,
          second_row_top: secondRowTop,
          second_row_visible: secondRowTop != null ? secondRowTop < window.innerHeight : false,
          card_rects: cardRects,
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
      if (metrics.column_count !== viewport.expectedColumns) {
        throw new Error(`${viewport.name}: expected ${viewport.expectedColumns} columns, got ${metrics.column_count} (${metrics.column_template})`);
      }
      if (metrics.first_row_count !== viewport.expectedColumns) {
        throw new Error(`${viewport.name}: expected ${viewport.expectedColumns} cards in first row, got ${metrics.first_row_count}`);
      }
      if (viewport.width >= 1280 && !metrics.second_row_visible) {
        throw new Error(`${viewport.name}: second row must be visible in initial viewport, starts at ${metrics.second_row_top}px`);
      }
      if (viewport.width >= 1280 && (metrics.card_rects[0]?.height ?? 999) > 430) {
        throw new Error(`${viewport.name}: desktop card too tall at ${metrics.card_rects[0]?.height}px`);
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
