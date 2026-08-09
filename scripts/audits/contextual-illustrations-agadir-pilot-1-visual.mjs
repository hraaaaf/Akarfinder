import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.CONTEXTUAL_ILLUSTRATIONS_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = "data/audits/contextual-illustrations-agadir-pilot-1";
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "tablet-768x900", width: 768, height: 900 },
  { name: "desktop-1280x900", width: 1280, height: 900 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
];

const EXPECTED_ASSET_IDS = [
  "agadir-city-01", "agadir-city-02", "agadir-city-03", "agadir-city-04",
  "agadir-apartment-01", "agadir-apartment-02", "agadir-apartment-03", "agadir-apartment-04",
  "agadir-villa-01", "agadir-villa-02", "agadir-villa-03", "agadir-villa-04",
].sort();

const baseResult = {
  snippet: "Fixture de certification du pilote Agadir.",
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

function result(id, original_url, propertyType, price, surface) {
  return {
    ...baseResult,
    id,
    title: `${propertyType} à Agadir`,
    original_url,
    display_url: original_url.replace("https://", ""),
    normalized_city: "Agadir",
    normalized_property_type: propertyType,
    normalized_price_mad: price,
    normalized_surface_m2: surface,
  };
}

const externalResults = [
  result("a0", "https://example.com/agadir/appartement/0", "Appartement", 1450000, 91),
  result("a1", "https://example.com/agadir/appartement/1", "Appartement", 1680000, 104),
  result("a2", "https://example.com/agadir/appartement/2", "Appartement", 1930000, 118),
  result("a3", "https://example.com/agadir/appartement/3", "Appartement", 2210000, 132),
  result("v0", "https://example.com/agadir/villa/0", "Villa", 4700000, 310),
  result("v1", "https://example.com/agadir/villa/1", "Villa", 5900000, 360),
  result("v2", "https://example.com/agadir/villa/2", "Villa", 7100000, 410),
  result("v3", "https://example.com/agadir/villa/3", "Villa", 8500000, 470),
  result("c0", "https://example.com/agadir/maison/0", "Maison", 2800000, 180),
  result("c1", "https://example.com/agadir/maison/3", "Maison", 3100000, 205),
  result("c2", "https://example.com/agadir/maison/5", "Maison", 3400000, 225),
  result("c3", "https://example.com/agadir/maison/6", "Maison", 3750000, 248),
  { ...baseResult, id: "type-only", title: "Villa hors ville allowlist", original_url: "https://example.com/oujda/villa", display_url: "example.com/oujda/villa", normalized_city: "Oujda", normalized_property_type: "Villa", normalized_price_mad: 2400000, normalized_surface_m2: 280 },
  { ...baseResult, id: "neutral", title: "Bien à confirmer", original_url: "https://example.com/neutral", display_url: "example.com/neutral" },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
let failure = null;

async function readMetrics(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-search-external-mobile-grid] [data-unified-listing-card]')];
    const text = (node) => (node?.innerText ?? node?.textContent ?? "").replace(/\s+/g, " ").trim();
    const visualState = cards.map((card) => ({
      contextualCity: card.querySelector('[data-contextual-city]')?.getAttribute('data-contextual-city') ?? null,
      contextualAssetId: card.querySelector('[data-contextual-asset-id]')?.getAttribute('data-contextual-asset-id') ?? null,
      contextualTier: card.querySelector('[data-contextual-tier]')?.getAttribute('data-contextual-tier') ?? null,
      neutral: Boolean(card.querySelector('[data-contextual-neutral]')),
      illustrationLabel: text(card.querySelector('[data-contextual-illustration-label]')),
    }));
    const clippedLabels = cards.map((card) => card.querySelector('[data-contextual-illustration-label]')).filter((node) => node && node.scrollWidth > node.clientWidth + 1).length;
    const clippedPrices = cards.map((card) => card.querySelector('[data-mobile-price]')).filter((node) => node && node.scrollWidth > node.clientWidth + 1).length;
    return {
      cardCount: cards.length,
      visualState,
      clippedLabels,
      clippedPrices,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
}

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.route("**/api/search?**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ listings: [], total: 0, limit: 100, offset: 0, source: "agadir-pilot-ci", generated_at: new Date().toISOString() }) }));
    await page.route("**/api/search/gateway?**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, degraded: false, provider: "fixture", sources_queried: ["fixture-source"], results_count: externalResults.length, results: externalResults }) }));

    try {
      const response = await page.goto(`${baseUrl}/search?q=agadir`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      if (!response || response.status() >= 400) throw new Error(`${viewport.name}: search returned ${response?.status() ?? "no response"}`);
      await page.waitForSelector('[data-search-external-mobile-grid] [data-unified-listing-card]', { timeout: 20_000 });

      const metrics = await readMetrics(page);
      if (metrics.cardCount !== 14) throw new Error(`${viewport.name}: expected 14 cards, got ${metrics.cardCount}`);
      if (metrics.scrollWidth > metrics.clientWidth) throw new Error(`${viewport.name}: horizontal overflow ${metrics.scrollWidth}/${metrics.clientWidth}`);
      if (metrics.clippedLabels !== 0 || metrics.clippedPrices !== 0) throw new Error(`${viewport.name}: clipped labels/prices`);

      const pilot = metrics.visualState.slice(0, 12);
      const uniqueAssetIds = new Set(pilot.map((state) => state.contextualAssetId));
      if (uniqueAssetIds.size !== 12) throw new Error(`${viewport.name}: expected 12 unique Agadir assets, got ${uniqueAssetIds.size}`);
      const ids = [...uniqueAssetIds].sort();
      if (JSON.stringify(ids) !== JSON.stringify(EXPECTED_ASSET_IDS)) throw new Error(`${viewport.name}: asset set drift ${JSON.stringify(ids)}`);
      if (pilot.some((state) => state.contextualCity !== "Agadir" || state.illustrationLabel !== "Illustration")) throw new Error(`${viewport.name}: Agadir disclosure/city drift`);
      if (pilot.slice(0, 8).some((state) => state.contextualTier !== "city_type")) throw new Error(`${viewport.name}: Appartement/Villa must use city_type`);
      if (pilot.slice(8, 12).some((state) => state.contextualTier !== "city")) throw new Error(`${viewport.name}: generic Agadir fallback must use city tier`);
      if (metrics.visualState[12]?.contextualAssetId !== null || metrics.visualState[12]?.neutral) throw new Error(`${viewport.name}: unknown city must retain property artwork fallback`);
      if (!metrics.visualState[13]?.neutral) throw new Error(`${viewport.name}: neutral fallback drift`);
      if (metrics.visualState.some((state) => state.illustrationLabel !== "Illustration")) throw new Error(`${viewport.name}: Illustration label drift`);

      const stableIds = metrics.visualState.map((state) => state.contextualAssetId);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForSelector('[data-search-external-mobile-grid] [data-unified-listing-card]', { timeout: 20_000 });
      const reloadMetrics = await readMetrics(page);
      if (JSON.stringify(reloadMetrics.visualState.map((state) => state.contextualAssetId)) !== JSON.stringify(stableIds)) throw new Error(`${viewport.name}: asset changed after reload`);
      if (reloadMetrics.scrollWidth > reloadMetrics.clientWidth || reloadMetrics.clippedLabels !== 0 || reloadMetrics.clippedPrices !== 0) throw new Error(`${viewport.name}: reload layout drift`);

      await page.screenshot({ path: `${outputDir}/${viewport.name}.png`, fullPage: true });
      results.push({ name: viewport.name, unique_agadir_assets: uniqueAssetIds.size, asset_ids: ids, stable_after_reload: true, clipped_labels: 0, clipped_prices: 0, horizontal_overflow: false });
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
