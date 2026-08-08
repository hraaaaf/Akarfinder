import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.SEARCH_CONTINUOUS_FLOW_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = "data/audits/search-continuous-flow-1";
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "desktop-1280x800", width: 1280, height: 800 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
];

const retiredCategoryHeadings = [
  "Promoteurs premium",
  "Agences partenaires",
  "Annonces sur AkarFinder",
  "Autres résultats",
  "Informations détaillées",
  "Informations à compléter",
  "Autres annonces",
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

const listings = [
  {
    ...baseListing,
    id: "flow-promoter",
    title: "01 Promoteur — appartement Agdal",
    source_name: "promoter-fixture",
    source_type: "Promoteur",
    source_badge: "premium_partner",
    source_display_type: "partner_source",
    source_access_level: "partner_full",
    original_source_required: false,
    can_show_contact: true,
    search_result_display_mode: "full_partner_listing",
  },
  {
    ...baseListing,
    id: "flow-agency",
    title: "02 Agence — appartement Agdal",
    source_name: "agency-fixture",
    source_type: "Agence",
    source_badge: "premium_partner",
    source_display_type: "partner_source",
    source_access_level: "partner_full",
    original_source_required: false,
    can_show_contact: true,
    search_result_display_mode: "full_partner_listing",
  },
  {
    ...baseListing,
    id: "flow-direct",
    title: "03 Direct — appartement Agdal",
    source_name: "AkarFinder",
    source_type: "Particulier",
    acquisition_channel: "first_party_user",
    origin_type: "first_party_user",
    original_source_required: false,
    can_show_contact: true,
  },
  {
    ...baseListing,
    id: "flow-public",
    title: "04 Public — appartement Agdal",
    source_name: "source-externe.ma",
    source_type: "Source externe",
    source_badge: "external_web_result",
    source_display_type: "external_web_result",
    source_access_level: "indexed_only",
    original_source_required: true,
    can_show_contact: false,
    search_result_display_mode: "thin_indexed_result",
  },
];

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
        body: JSON.stringify({ listings, total: listings.length, limit: 100, offset: 0, source: "continuous-flow-ci", generated_at: new Date().toISOString() }),
      });
    });
    await page.route("**/api/search/gateway?**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: [], total_count: 0, next_cursor: null, has_more: false }) });
    });

    try {
      const response = await page.goto(`${baseUrl}/search?q=appartement%20rabat`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      if (!response || response.status() >= 400) throw new Error(`${viewport.name}: search returned ${response?.status() ?? "no response"}`);
      await page.waitForSelector('[data-search-continuous-flow] article[data-property-active]', { timeout: 20_000 });

      const metrics = await page.evaluate((retiredHeadings) => {
        const flow = document.querySelector("[data-search-continuous-flow]");
        const cards = [...document.querySelectorAll('[data-search-continuous-flow] article[data-property-active]')];
        const rects = cards.map((card) => card.getBoundingClientRect());
        const first = rects[0];
        const text = document.body.innerText;
        const visibleRetiredHeadings = retiredHeadings.filter((heading) => text.includes(heading));
        const titles = cards.map((card) => card.textContent ?? "");
        const expectedTitleOrder = ["01 Promoteur", "02 Agence", "03 Direct", "04 Public"];
        const ordered = expectedTitleOrder.every((expected, index) => titles[index]?.includes(expected));
        const mobileVerticalGaps = rects.slice(1).map((rect, index) => Math.round(rect.top - rects[index].bottom));
        return {
          flowExists: Boolean(flow),
          cardCount: cards.length,
          firstResultTop: first ? Math.round(first.top) : null,
          firstResultVisible: first ? first.top < window.innerHeight : false,
          ordered,
          visibleRetiredHeadings,
          maxVerticalGap: mobileVerticalGaps.length ? Math.max(...mobileVerticalGaps) : 0,
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      }, retiredCategoryHeadings);

      const overflow = metrics.scrollWidth > metrics.clientWidth;
      await page.screenshot({ path: `${outputDir}/${viewport.name}.png`, fullPage: true });

      if (!metrics.flowExists) throw new Error(`${viewport.name}: continuous flow marker missing`);
      if (metrics.cardCount !== 4) throw new Error(`${viewport.name}: expected 4 internal cards, got ${metrics.cardCount}`);
      if (!metrics.ordered) throw new Error(`${viewport.name}: commercial/truth order changed`);
      if (metrics.visibleRetiredHeadings.length) throw new Error(`${viewport.name}: category headings visible: ${metrics.visibleRetiredHeadings.join(", ")}`);
      if (overflow) throw new Error(`${viewport.name}: horizontal overflow ${metrics.scrollWidth}/${metrics.clientWidth}`);
      if (!metrics.firstResultVisible) throw new Error(`${viewport.name}: first result below viewport at ${metrics.firstResultTop}px`);
      if (viewport.width < 768 && metrics.maxVerticalGap > 24) throw new Error(`${viewport.name}: visual rupture between cards (${metrics.maxVerticalGap}px)`);

      results.push({
        name: viewport.name,
        first_result_top: metrics.firstResultTop,
        first_result_visible: metrics.firstResultVisible,
        card_count: metrics.cardCount,
        order_preserved: metrics.ordered,
        category_headings_visible: metrics.visibleRetiredHeadings,
        max_vertical_gap: metrics.maxVerticalGap,
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
