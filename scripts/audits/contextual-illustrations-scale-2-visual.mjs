import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.CONTEXTUAL_ILLUSTRATIONS_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = "data/audits/contextual-illustrations-scale-2";
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "tablet-768x900", width: 768, height: 900 },
  { name: "desktop-1280x900", width: 1280, height: 900 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
];

const EXPECTED_SCALE2_IDS = [
  ...["city", "apartment", "villa"].flatMap((kind) => [1, 2, 3, 4].map((n) => `rabat-${kind}-0${n}`)),
  ...["city", "apartment", "villa"].flatMap((kind) => [1, 2, 3, 4].map((n) => `tanger-${kind}-0${n}`)),
  ...["city", "apartment", "villa"].flatMap((kind) => [1, 2, 3, 4].map((n) => `fes-${kind}-0${n}`)),
].sort();

const baseResult = {
  snippet: "Fixture de certification SCALE-2.", source_id: "fixture-source", source_name: "Source Démo", domain: "example.com",
  result_origin: "public_sitemap", search_result_display_mode: "thin_indexed_result", source_badge: "public_indexed",
  production_allowed: true, can_show_result: true, can_show_thumbnail: false, can_show_contact: false, can_show_gallery: false,
  can_cache_thumbnail: false, can_download_thumbnail: false, primary_cta: "view_original", primary_cta_label: "Voir sur le site d’origine",
  result_attribution_label: "Résultat public indexé", thumbnail_risk_accepted: false, normalized_intent: "buy", quality_tier: "Q2_comparable", quality_score: 82,
};
const make = (id, original_url, city, propertyType, price, surface) => ({ ...baseResult, id, title: `${propertyType} à ${city}`, original_url, display_url: original_url.replace("https://", ""), normalized_city: city, normalized_property_type: propertyType, normalized_price_mad: price, normalized_surface_m2: surface });

const externalResults = [
  make("ra0", "https://example.com/rabat/appartement/5", "Rabat", "Appartement", 1550000, 88), make("ra1", "https://example.com/rabat/appartement/3", "Rabat", "Appartement", 1780000, 101), make("ra2", "https://example.com/rabat/appartement/4", "Rabat", "Appartement", 2050000, 116), make("ra3", "https://example.com/rabat/appartement/0", "Rabat", "Appartement", 2320000, 132),
  make("rv0", "https://example.com/rabat/villa/0", "Rabat", "Villa", 5400000, 310), make("rv1", "https://example.com/rabat/villa/5", "Rabat", "Villa", 6200000, 350), make("rv2", "https://example.com/rabat/villa/6", "Rabat", "Villa", 7100000, 395), make("rv3", "https://example.com/rabat/villa/1", "Rabat", "Villa", 8200000, 445),
  make("rc0", "https://example.com/rabat/maison/0", "Rabat", "Maison", 3100000, 185), make("rc1", "https://example.com/rabat/maison/1", "Rabat", "Maison", 3450000, 205), make("rc2", "https://example.com/rabat/maison/6", "Rabat", "Maison", 3800000, 225), make("rc3", "https://example.com/rabat/maison/2", "Rabat", "Maison", 4200000, 245),
  make("ta0", "https://example.com/tanger/appartement/5", "Tanger", "Appartement", 1450000, 85), make("ta1", "https://example.com/tanger/appartement/4", "Tanger", "Appartement", 1650000, 98), make("ta2", "https://example.com/tanger/appartement/3", "Tanger", "Appartement", 1900000, 112), make("ta3", "https://example.com/tanger/appartement/0", "Tanger", "Appartement", 2180000, 126),
  make("tv0", "https://example.com/tanger/villa/5", "Tanger", "Villa", 4800000, 295), make("tv1", "https://example.com/tanger/villa/4", "Tanger", "Villa", 5600000, 335), make("tv2", "https://example.com/tanger/villa/3", "Tanger", "Villa", 6500000, 380), make("tv3", "https://example.com/tanger/villa/0", "Tanger", "Villa", 7400000, 425),
  make("tc0", "https://example.com/tanger/maison/1", "Tanger", "Maison", 2850000, 175), make("tc1", "https://example.com/tanger/maison/0", "Tanger", "Maison", 3150000, 195), make("tc2", "https://example.com/tanger/maison/3", "Tanger", "Maison", 3500000, 215), make("tc3", "https://example.com/tanger/maison/2", "Tanger", "Maison", 3900000, 235),
  make("fa0", "https://example.com/fes/appartement/0", "Fès", "Appartement", 980000, 82), make("fa1", "https://example.com/fes/appartement/2", "Fès", "Appartement", 1120000, 96), make("fa2", "https://example.com/fes/appartement/5", "Fès", "Appartement", 1290000, 109), make("fa3", "https://example.com/fes/appartement/1", "Fès", "Appartement", 1480000, 124),
  make("fv0", "https://example.com/fes/villa/1", "Fès", "Villa", 3500000, 270), make("fv1", "https://example.com/fes/villa/0", "Fès", "Villa", 4100000, 310), make("fv2", "https://example.com/fes/villa/10", "Fès", "Villa", 4750000, 355), make("fv3", "https://example.com/fes/villa/2", "Fès", "Villa", 5400000, 400),
  make("fc0", "https://example.com/fes/maison/1", "Fès", "Maison", 2050000, 160), make("fc1", "https://example.com/fes/maison/4", "Fès", "Maison", 2350000, 180), make("fc2", "https://example.com/fes/maison/3", "Fès", "Maison", 2650000, 200), make("fc3", "https://example.com/fes/maison/0", "Fès", "Maison", 2980000, 220),
  make("pred-m", "https://example.com/marrakech/appartement/0", "Marrakech", "Appartement", 1650000, 92),
  make("pred-c", "https://example.com/casablanca/villa/4", "Casablanca", "Villa", 7200000, 330),
  make("pred-a", "https://example.com/agadir/appartement/0", "Agadir", "Appartement", 1450000, 91),
  { ...baseResult, id: "type-only", title: "Villa hors allowlist", original_url: "https://example.com/oujda/villa", display_url: "example.com/oujda/villa", normalized_city: "Oujda", normalized_property_type: "Villa", normalized_price_mad: 2400000, normalized_surface_m2: 280 },
  { ...baseResult, id: "neutral", title: "Bien à confirmer", original_url: "https://example.com/neutral", display_url: "example.com/neutral" },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
let failure = null;

async function hydrateLazyVisuals(page) {
  const cards = await page.locator('[data-search-external-mobile-grid] [data-unified-listing-card]').all();
  for (const card of cards) {
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(35);
  }
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll('[data-search-external-mobile-grid] [data-unified-listing-card] img')];
    return images.every((image) => image.complete && image.naturalWidth > 0);
  }, { timeout: 15_000 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(100);
}

async function readMetrics(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-search-external-mobile-grid] [data-unified-listing-card]')];
    const text = (node) => (node?.innerText ?? node?.textContent ?? "").replace(/\s+/g, " ").trim();
    const visualState = cards.map((card) => ({ contextualCity: card.querySelector('[data-contextual-city]')?.getAttribute('data-contextual-city') ?? null, contextualAssetId: card.querySelector('[data-contextual-asset-id]')?.getAttribute('data-contextual-asset-id') ?? null, contextualTier: card.querySelector('[data-contextual-tier]')?.getAttribute('data-contextual-tier') ?? null, neutral: Boolean(card.querySelector('[data-contextual-neutral]')), illustrationLabel: text(card.querySelector('[data-contextual-illustration-label]')) }));
    const clippedLabels = cards.map((card) => card.querySelector('[data-contextual-illustration-label]')).filter((node) => node && node.scrollWidth > node.clientWidth + 1).length;
    const clippedPrices = cards.map((card) => card.querySelector('[data-mobile-price]')).filter((node) => node && node.scrollWidth > node.clientWidth + 1).length;
    return { cardCount: cards.length, visualState, clippedLabels, clippedPrices, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth };
  });
}

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.route("**/api/search?**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ listings: [], total: 0, limit: 100, offset: 0, source: "scale-2-ci", generated_at: new Date().toISOString() }) }));
    await page.route("**/api/search/gateway?**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, degraded: false, provider: "fixture", sources_queried: ["fixture-source"], results_count: externalResults.length, results: externalResults }) }));
    try {
      const response = await page.goto(`${baseUrl}/search?q=immobilier`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      if (!response || response.status() >= 400) throw new Error(`${viewport.name}: search returned ${response?.status() ?? "no response"}`);
      await page.waitForSelector('[data-search-external-mobile-grid] [data-unified-listing-card]', { timeout: 20_000 });
      await hydrateLazyVisuals(page);
      const metrics = await readMetrics(page);
      if (metrics.cardCount !== 41) throw new Error(`${viewport.name}: expected 41 cards, got ${metrics.cardCount}`);
      if (metrics.scrollWidth > metrics.clientWidth || metrics.clippedLabels || metrics.clippedPrices) throw new Error(`${viewport.name}: overflow or clipping`);
      const scale2 = metrics.visualState.slice(0, 36);
      const uniqueScale2Ids = new Set(scale2.map((state) => state.contextualAssetId));
      if (uniqueScale2Ids.size !== 36) throw new Error(`${viewport.name}: expected 36 unique SCALE-2 assets, got ${uniqueScale2Ids.size}`);
      const ids = [...uniqueScale2Ids].sort();
      if (JSON.stringify(ids) !== JSON.stringify(EXPECTED_SCALE2_IDS)) throw new Error(`${viewport.name}: SCALE-2 asset set drift`);
      if (scale2.some((state) => !["Rabat", "Tanger", "Fès"].includes(state.contextualCity) || state.illustrationLabel !== "Illustration")) throw new Error(`${viewport.name}: SCALE-2 disclosure/city drift`);
      for (const offset of [0, 12, 24]) {
        if (scale2.slice(offset, offset + 8).some((state) => state.contextualTier !== "city_type")) throw new Error(`${viewport.name}: apartment/villa tier drift`);
        if (scale2.slice(offset + 8, offset + 12).some((state) => state.contextualTier !== "city")) throw new Error(`${viewport.name}: generic city tier drift`);
      }
      const predecessors = metrics.visualState.slice(36, 39);
      if (predecessors[0]?.contextualCity !== "Marrakech" || predecessors[0]?.contextualAssetId !== "marrakech-apartment-01") throw new Error(`${viewport.name}: Marrakech predecessor drift`);
      if (predecessors[1]?.contextualCity !== "Casablanca" || predecessors[1]?.contextualAssetId !== "casablanca-villa-01") throw new Error(`${viewport.name}: Casablanca predecessor drift`);
      if (predecessors[2]?.contextualCity !== "Agadir" || !predecessors[2]?.contextualAssetId?.startsWith("agadir-")) throw new Error(`${viewport.name}: Agadir predecessor drift`);
      if (metrics.visualState[39]?.contextualAssetId !== null || metrics.visualState[39]?.neutral) throw new Error(`${viewport.name}: property artwork fallback drift`);
      if (!metrics.visualState[40]?.neutral) throw new Error(`${viewport.name}: neutral fallback drift`);
      if (metrics.visualState.some((state) => state.illustrationLabel !== "Illustration")) throw new Error(`${viewport.name}: disclosure drift`);
      const stableIds = metrics.visualState.map((state) => state.contextualAssetId);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForSelector('[data-search-external-mobile-grid] [data-unified-listing-card]', { timeout: 20_000 });
      await hydrateLazyVisuals(page);
      const reloaded = await readMetrics(page);
      if (JSON.stringify(reloaded.visualState.map((state) => state.contextualAssetId)) !== JSON.stringify(stableIds)) throw new Error(`${viewport.name}: asset changed after reload`);
      if (reloaded.scrollWidth > reloaded.clientWidth || reloaded.clippedLabels || reloaded.clippedPrices) throw new Error(`${viewport.name}: reload layout drift`);
      await page.screenshot({ path: `${outputDir}/${viewport.name}.png`, fullPage: true });
      results.push({ name: viewport.name, unique_scale2_assets: uniqueScale2Ids.size, stable_after_reload: true, lazy_visuals_hydrated: true, clipped_labels: 0, clipped_prices: 0, horizontal_overflow: false });
    } catch (error) { failure = error; break; } finally { await page.close(); }
  }
} finally { await browser.close(); }
await writeFile(`${outputDir}/metrics.json`, `${JSON.stringify({ generated_at: new Date().toISOString(), results, failure: failure instanceof Error ? failure.message : null }, null, 2)}\n`, "utf8");
console.log(JSON.stringify(results, null, 2));
if (failure) throw failure;
