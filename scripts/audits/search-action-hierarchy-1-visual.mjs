import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.SEARCH_ACTION_HIERARCHY_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = "data/audits/search-action-hierarchy-1";
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
  description: "Fixture déterministe action hierarchy.",
  image_url: "",
  reliability_explanation: "Fixture CI",
  data_completeness_score: 90,
  duplicate_score: 0.1,
  can_show_result: true,
  production_allowed: true,
  can_show_thumbnail: false,
  display_images: { policy: "no_listing_image", urls: [] },
  image_permission_status: "unknown",
  can_show_contact: true,
  original_source_required: false,
};

const listings = [1, 2, 3, 4].map((index) => ({
  ...baseListing,
  id: `action-hierarchy-${index}`,
  title: `${index.toString().padStart(2, "0")} Appartement test Agdal`,
  source_name: index === 1 ? "Promoteur test" : "AkarFinder",
  source_type: index === 1 ? "Promoteur" : "Particulier",
  source_badge: index === 1 ? "premium_partner" : undefined,
  source_display_type: index === 1 ? "partner_source" : undefined,
  source_access_level: index === 1 ? "partner_full" : undefined,
  acquisition_channel: index > 1 ? "first_party_user" : undefined,
  origin_type: index > 1 ? "first_party_user" : undefined,
  search_result_display_mode: index === 1 ? "full_partner_listing" : undefined,
  listing_url: index === 1 ? "https://example.com/original/action-hierarchy-1" : undefined,
  allowed_ctas: index === 1 ? ["view_source"] : undefined,
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
        body: JSON.stringify({ listings, total: listings.length, limit: 100, offset: 0, source: "action-hierarchy-ci", generated_at: new Date().toISOString() }),
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
        const visible = (node) => {
          if (!node) return false;
          const style = getComputedStyle(node);
          return style.display !== "none" && style.visibility !== "hidden" && Number.parseFloat(style.opacity || "1") > 0 && node.getClientRects().length > 0;
        };
        const perCard = cards.map((card) => {
          const primary = [...card.querySelectorAll('[data-card-primary-action]')].filter(visible);
          const sourceLinks = [...card.querySelectorAll('[data-secondary-source-link]')].filter(visible);
          const legacySecondary = [...card.querySelectorAll("button, a")].filter((node) => {
            if (!visible(node)) return false;
            const text = (node.textContent ?? "").trim();
            return text.includes("Repérer sur la carte") || text.includes("Comparer");
          });
          const price = card.querySelector('[data-mobile-price]');
          return {
            primaryActions: primary.length,
            primaryText: primary.map((node) => (node.textContent ?? "").trim()),
            sourceLinks: sourceLinks.length,
            sourceText: sourceLinks.map((node) => (node.textContent ?? "").trim()),
            legacySecondary: legacySecondary.length,
            priceClipped: Boolean(price && price.scrollWidth > price.clientWidth + 1),
          };
        });
        return {
          cardCount: cards.length,
          perCard,
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      const overflow = metrics.scrollWidth > metrics.clientWidth;
      await page.screenshot({ path: `${outputDir}/${viewport.name}.png`, fullPage: true });
      if (metrics.cardCount !== 4) throw new Error(`${viewport.name}: expected 4 cards, got ${metrics.cardCount}`);
      if (overflow) throw new Error(`${viewport.name}: horizontal overflow ${metrics.scrollWidth}/${metrics.clientWidth}`);
      if (metrics.perCard.some((card) => card.legacySecondary !== 0)) throw new Error(`${viewport.name}: legacy Map/Compare action is visible`);
      if (viewport.width < 640) {
        if (metrics.perCard.some((card) => card.primaryActions !== 0)) throw new Error(`${viewport.name}: strong card CTA visible on mobile`);
        if (metrics.perCard.some((card) => card.priceClipped)) throw new Error(`${viewport.name}: truncated mobile price`);
      } else {
        if (metrics.perCard.some((card) => card.primaryActions !== 1)) throw new Error(`${viewport.name}: expected exactly one strong CTA per card`);
        if (!metrics.perCard[0]?.primaryText.some((text) => text.includes("Voir le bien"))) throw new Error(`${viewport.name}: internal primary CTA missing`);
        if (metrics.perCard[0]?.sourceLinks !== 1) throw new Error(`${viewport.name}: discrete source attribution link missing`);
      }

      results.push({ name: viewport.name, horizontal_overflow: overflow, cards: metrics.perCard });
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
