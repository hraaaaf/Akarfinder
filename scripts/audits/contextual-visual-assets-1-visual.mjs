import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.CONTEXTUAL_VISUAL_ASSETS_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = "data/audits/contextual-visual-assets-1";
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "tablet-768x900", width: 768, height: 900 },
  { name: "desktop-1280x900", width: 1280, height: 900 },
];

const baseResult = {
  snippet: "Fixture contextuelle déterministe.",
  source_id: "fixture-source",
  source_name: "Source Démo",
  domain: "example.com",
  result_origin: "public_sitemap",
  search_result_display_mode: "thin_indexed_result",
  source_badge: "public_indexed",
  production_allowed: true,
  can_show_result: true,
  can_show_thumbnail: false,
  can_show_contact: false,
  can_show_gallery: false,
  can_cache_thumbnail: false,
  can_download_thumbnail: false,
  primary_cta: "view_original",
  primary_cta_label: "Voir sur le site d’origine",
  result_attribution_label: "Résultat public indexé",
  thumbnail_risk_accepted: false,
  normalized_intent: "buy",
  quality_tier: "Q2_comparable",
  quality_score: 82,
};

const externalResults = [
  {
    ...baseResult,
    id: "context-rabat",
    title: "Appartement à Rabat",
    original_url: "https://example.com/rabat",
    display_url: "example.com/rabat",
    normalized_city: "Rabat",
    normalized_property_type: "Appartement",
    normalized_price_mad: 1850000,
    normalized_surface_m2: 112,
  },
  {
    ...baseResult,
    id: "context-marrakech",
    title: "Terrain à Marrakech",
    original_url: "https://example.com/marrakech",
    display_url: "example.com/marrakech",
    normalized_city: "Marrakech",
    normalized_property_type: "Terrain",
    normalized_price_mad: 920000,
    normalized_surface_m2: 250,
  },
  {
    ...baseResult,
    id: "type-only",
    title: "Villa hors ville allowlist",
    original_url: "https://example.com/type-only",
    display_url: "example.com/type-only",
    normalized_city: "Oujda",
    normalized_property_type: "Villa",
    normalized_price_mad: 2400000,
    normalized_surface_m2: 280,
  },
  {
    ...baseResult,
    id: "neutral",
    title: "Bien à confirmer",
    original_url: "https://example.com/neutral",
    display_url: "example.com/neutral",
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
        body: JSON.stringify({ listings: [], total: 0, limit: 100, offset: 0, source: "contextual-visual-ci", generated_at: new Date().toISOString() }),
      });
    });
    await page.route("**/api/search/gateway?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, degraded: false, provider: "fixture", sources_queried: ["fixture-source"], results_count: 4, results: externalResults }),
      });
    });

    try {
      const response = await page.goto(`${baseUrl}/search?q=immobilier`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      if (!response || response.status() >= 400) throw new Error(`${viewport.name}: search returned ${response?.status() ?? "no response"}`);
      await page.waitForSelector('[data-search-external-mobile-grid] [data-unified-listing-card]', { timeout: 20_000 });

      const metrics = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('[data-search-external-mobile-grid] [data-unified-listing-card]')];
        const rects = cards.map((card) => card.getBoundingClientRect());
        const text = (node) => (node?.innerText ?? node?.textContent ?? "").replace(/\s+/g, " ").trim();
        const visualState = cards.map((card) => ({
          contextualCity: card.querySelector('[data-contextual-city]')?.getAttribute('data-contextual-city') ?? null,
          neutral: Boolean(card.querySelector('[data-contextual-neutral]')),
          illustrationLabel: text(card.querySelector('[data-contextual-illustration-label]')),
          fullText: text(card),
        }));
        const clippedLabels = cards
          .map((card) => card.querySelector('[data-contextual-illustration-label]'))
          .filter((node) => node && node.scrollWidth > node.clientWidth + 1).length;
        const clippedPrices = cards
          .map((card) => card.querySelector('[data-mobile-price]'))
          .filter((node) => node && node.scrollWidth > node.clientWidth + 1).length;

        return {
          cardCount: cards.length,
          visualState,
          secondSameRow: Boolean(rects[0] && rects[1] && Math.abs(rects[0].top - rects[1].top) <= 2),
          thirdNextRow: Boolean(rects[0] && rects[2] && rects[2].top > rects[0].top + 40),
          clippedLabels,
          clippedPrices,
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      if (metrics.cardCount !== 4) throw new Error(`${viewport.name}: expected 4 cards, got ${metrics.cardCount}`);
      if (metrics.scrollWidth > metrics.clientWidth) throw new Error(`${viewport.name}: horizontal overflow ${metrics.scrollWidth}/${metrics.clientWidth}`);
      if (metrics.visualState[0]?.contextualCity !== "Rabat") throw new Error(`${viewport.name}: Rabat contextual visual missing`);
      if (metrics.visualState[1]?.contextualCity !== "Marrakech") throw new Error(`${viewport.name}: Marrakech contextual visual missing`);

      const mobile = viewport.width < 640;
      const expectedRabatLabel = mobile ? "Illustration" : "Visuel illustratif · Rabat";
      const expectedMarrakechLabel = mobile ? "Illustration" : "Visuel illustratif · Marrakech";
      const expectedGenericLabel = mobile ? "Illustration" : "Visuel illustratif";
      if (metrics.visualState[0]?.illustrationLabel !== expectedRabatLabel) throw new Error(`${viewport.name}: Rabat illustration disclosure missing`);
      if (metrics.visualState[1]?.illustrationLabel !== expectedMarrakechLabel) throw new Error(`${viewport.name}: Marrakech illustration disclosure missing`);
      if (metrics.visualState[2]?.contextualCity !== null || metrics.visualState[2]?.neutral) throw new Error(`${viewport.name}: unknown city should fall back to property artwork`);
      if (metrics.visualState[2]?.illustrationLabel !== expectedGenericLabel) throw new Error(`${viewport.name}: type-only disclosure drift`);
      if (!metrics.visualState[3]?.neutral) throw new Error(`${viewport.name}: no-context row must use neutral fallback`);
      if (metrics.visualState[3]?.illustrationLabel !== expectedGenericLabel) throw new Error(`${viewport.name}: neutral disclosure drift`);
      if (!metrics.visualState[3]?.fullText.includes("Localisation non précisée")) throw new Error(`${viewport.name}: no-context location truth missing`);
      if (metrics.clippedLabels !== 0) throw new Error(`${viewport.name}: ${metrics.clippedLabels} illustration labels clipped`);
      if (metrics.clippedPrices !== 0) throw new Error(`${viewport.name}: ${metrics.clippedPrices} prices clipped`);

      if (mobile && (!metrics.secondSameRow || !metrics.thirdNextRow)) {
        throw new Error(`${viewport.name}: two-column card rhythm regressed`);
      }

      await page.screenshot({ path: `${outputDir}/${viewport.name}.png`, fullPage: true });
      results.push({
        name: viewport.name,
        rabat_context: metrics.visualState[0]?.contextualCity,
        marrakech_context: metrics.visualState[1]?.contextualCity,
        type_only_context: metrics.visualState[2]?.contextualCity,
        neutral_fallback: metrics.visualState[3]?.neutral,
        contextual_disclosure: metrics.visualState[0]?.illustrationLabel,
        clipped_labels: metrics.clippedLabels,
        clipped_prices: metrics.clippedPrices,
        horizontal_overflow: false,
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
