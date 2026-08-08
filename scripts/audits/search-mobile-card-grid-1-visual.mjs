import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.SEARCH_MOBILE_CARD_GRID_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = "data/audits/search-mobile-card-grid-1";
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "desktop-1280x800", width: 1280, height: 800 },
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
  description: "Fixture déterministe de certification visuelle.",
  image_url: "",
  reliability_explanation: "Fixture CI",
  data_completeness_score: 90,
  duplicate_score: 0.1,
  can_show_result: true,
  production_allowed: true,
  can_show_thumbnail: false,
  display_images: { policy: "no_listing_image", urls: [] },
  image_permission_status: "unknown",
};

const listings = [1, 2, 3, 4].map((index) => ({
  ...baseListing,
  id: `mobile-grid-${index}`,
  title: `${index.toString().padStart(2, "0")} Appartement test Agdal`,
  source_name: index === 1 ? "Promoteur test" : index === 2 ? "Agence test" : "AkarFinder",
  source_type: index === 1 ? "Promoteur" : index === 2 ? "Agence" : "Particulier",
  source_badge: index <= 2 ? "premium_partner" : undefined,
  source_display_type: index <= 2 ? "partner_source" : undefined,
  source_access_level: index <= 2 ? "partner_full" : undefined,
  acquisition_channel: index >= 3 ? "first_party_user" : undefined,
  origin_type: index >= 3 ? "first_party_user" : undefined,
  original_source_required: false,
  can_show_contact: true,
  search_result_display_mode: index <= 2 ? "full_partner_listing" : undefined,
}));

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
let failure = null;

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.route("**/api/search?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ listings, total: listings.length, limit: 100, offset: 0, source: "mobile-card-grid-ci", generated_at: new Date().toISOString() }),
      });
    });
    await page.route("**/api/search/gateway?**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: [], total_count: 0, next_cursor: null, has_more: false }) });
    });

    try {
      const response = await page.goto(`${baseUrl}/search?q=appartement%20rabat`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      if (!response || response.status() >= 400) throw new Error(`${viewport.name}: search returned ${response?.status() ?? "no response"}`);
      await page.waitForSelector('[data-search-continuous-flow] [data-mobile-compact-card]', { timeout: 20_000 });

      const metrics = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('[data-search-continuous-flow] [data-mobile-compact-card]')].slice(0, 4);
        const rects = cards.map((card) => card.getBoundingClientRect());
        const first = rects[0];
        const second = rects[1];
        const third = rects[2];
        const mobileActions = [...document.querySelectorAll('[data-search-continuous-flow] [data-mobile-compact-card]')]
          .flatMap((card) => [...card.querySelectorAll("button, a")])
          .filter((node) => {
            const text = (node.textContent ?? "").trim();
            const style = getComputedStyle(node);
            const actuallyVisible =
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              Number.parseFloat(style.opacity || "1") > 0 &&
              node.getClientRects().length > 0;
            const secondaryAction =
              text.includes("Repérer sur la carte") ||
              text.includes("Comparer") ||
              text === "Voir le bien" ||
              text === "Voir la source";
            return actuallyVisible && secondaryAction;
          }).length;
        const clippedPrices = cards
          .map((card) => card.querySelector('[data-mobile-price]'))
          .filter((node) => node && node.scrollWidth > node.clientWidth + 1).length;
        return {
          cardCount: cards.length,
          firstResultTop: first ? Math.round(first.top) : null,
          firstResultVisible: first ? first.top < window.innerHeight : false,
          firstWidth: first ? Math.round(first.width) : null,
          firstHeight: first ? Math.round(first.height) : null,
          secondSameRow: Boolean(first && second && Math.abs(first.top - second.top) <= 2),
          thirdNextRow: Boolean(first && third && third.top > first.top + 40),
          mobileActions,
          clippedPrices,
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      const overflow = metrics.scrollWidth > metrics.clientWidth;
      await page.screenshot({ path: `${outputDir}/${viewport.name}.png`, fullPage: true });

      if (metrics.cardCount !== 4) throw new Error(`${viewport.name}: expected 4 cards, got ${metrics.cardCount}`);
      if (!metrics.firstResultVisible) throw new Error(`${viewport.name}: first result below viewport at ${metrics.firstResultTop}px`);
      if (overflow) throw new Error(`${viewport.name}: horizontal overflow ${metrics.scrollWidth}/${metrics.clientWidth}`);

      if (viewport.width < 640) {
        if (!metrics.secondSameRow || !metrics.thirdNextRow) throw new Error(`${viewport.name}: expected a real two-column mobile grid`);
        if (metrics.firstWidth == null || metrics.firstWidth > viewport.width * 0.49 || metrics.firstWidth < viewport.width * 0.40) {
          throw new Error(`${viewport.name}: mobile card width ${metrics.firstWidth}px is outside the compact two-column target`);
        }
        if (metrics.firstHeight == null || metrics.firstHeight > 360) throw new Error(`${viewport.name}: mobile card too tall at ${metrics.firstHeight}px`);
        if (metrics.mobileActions !== 0) throw new Error(`${viewport.name}: secondary mobile actions still visible (${metrics.mobileActions})`);
        if (metrics.clippedPrices !== 0) throw new Error(`${viewport.name}: ${metrics.clippedPrices} mobile prices are truncated`);
      }

      results.push({
        name: viewport.name,
        first_result_top: metrics.firstResultTop,
        first_result_visible: metrics.firstResultVisible,
        card_width: metrics.firstWidth,
        card_height: metrics.firstHeight,
        two_column_mobile: viewport.width < 640 ? metrics.secondSameRow && metrics.thirdNextRow : null,
        secondary_mobile_actions_visible: viewport.width < 640 ? metrics.mobileActions : null,
        truncated_mobile_prices: viewport.width < 640 ? metrics.clippedPrices : null,
        horizontal_overflow: overflow,
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
