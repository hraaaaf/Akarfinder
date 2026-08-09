import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.CONTEXTUAL_ILLUSTRATIONS_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = "data/audits/contextual-illustrations-scale-1";
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "tablet-768x900", width: 768, height: 900 },
  { name: "desktop-1280x900", width: 1280, height: 900 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
];

const EXPECTED_SCALE_IDS = [
  ...["city", "apartment", "villa"].flatMap((kind) => [1, 2, 3, 4].map((n) => `marrakech-${kind}-0${n}`)),
  ...["city", "apartment", "villa"].flatMap((kind) => [1, 2, 3, 4].map((n) => `casablanca-${kind}-0${n}`)),
].sort();

const baseResult = {
  snippet: "Fixture de certification SCALE-1.", source_id: "fixture-source", source_name: "Source Démo", domain: "example.com",
  result_origin: "public_sitemap", search_result_display_mode: "thin_indexed_result", source_badge: "public_indexed",
  production_allowed: true, can_show_result: true, can_show_thumbnail: false, can_show_contact: false, can_show_gallery: false,
  can_cache_thumbnail: false, can_download_thumbnail: false, primary_cta: "view_original", primary_cta_label: "Voir sur le site d’origine",
  result_attribution_label: "Résultat public indexé", thumbnail_risk_accepted: false, normalized_intent: "buy", quality_tier: "Q2_comparable", quality_score: 82,
};
const make = (id, original_url, city, propertyType, price, surface) => ({ ...baseResult, id, title: `${propertyType} à ${city}`, original_url, display_url: original_url.replace("https://", ""), normalized_city: city, normalized_property_type: propertyType, normalized_price_mad: price, normalized_surface_m2: surface });

const externalResults = [
  make("ma0", "https://example.com/marrakech/appartement/0", "Marrakech", "Appartement", 1650000, 92), make("ma1", "https://example.com/marrakech/appartement/5", "Marrakech", "Appartement", 1900000, 108), make("ma2", "https://example.com/marrakech/appartement/2", "Marrakech", "Appartement", 2150000, 122), make("ma3", "https://example.com/marrakech/appartement/1", "Marrakech", "Appartement", 2420000, 138),
  make("mv0", "https://example.com/marrakech/villa/1", "Marrakech", "Villa", 6200000, 350), make("mv1", "https://example.com/marrakech/villa/3", "Marrakech", "Villa", 7600000, 410), make("mv2", "https://example.com/marrakech/villa/0", "Marrakech", "Villa", 8900000, 470), make("mv3", "https://example.com/marrakech/villa/2", "Marrakech", "Villa", 10500000, 540),
  make("mc0", "https://example.com/marrakech/maison/5", "Marrakech", "Maison", 3200000, 210), make("mc1", "https://example.com/marrakech/maison/7", "Marrakech", "Maison", 3500000, 228), make("mc2", "https://example.com/marrakech/maison/0", "Marrakech", "Maison", 3800000, 245), make("mc3", "https://example.com/marrakech/maison/1", "Marrakech", "Maison", 4100000, 260),
  make("ca0", "https://example.com/casablanca/appartement/4", "Casablanca", "Appartement", 1800000, 88), make("ca1", "https://example.com/casablanca/appartement/6", "Casablanca", "Appartement", 2100000, 103), make("ca2", "https://example.com/casablanca/appartement/1", "Casablanca", "Appartement", 2450000, 118), make("ca3", "https://example.com/casablanca/appartement/0", "Casablanca", "Appartement", 2800000, 132),
  make("cv0", "https://example.com/casablanca/villa/4", "Casablanca", "Villa", 7200000, 330), make("cv1", "https://example.com/casablanca/villa/6", "Casablanca", "Villa", 8500000, 390), make("cv2", "https://example.com/casablanca/villa/9", "Casablanca", "Villa", 9800000, 445), make("cv3", "https://example.com/casablanca/villa/0", "Casablanca", "Villa", 11200000, 510),
  make("cc0", "https://example.com/casablanca/maison/0", "Casablanca", "Maison", 3900000, 190), make("cc1", "https://example.com/casablanca/maison/6", "Casablanca", "Maison", 4300000, 215), make("cc2", "https://example.com/casablanca/maison/5", "Casablanca", "Maison", 4700000, 235), make("cc3", "https://example.com/casablanca/maison/1", "Casablanca", "Maison", 5200000, 255),
  make("agadir", "https://example.com/agadir/appartement/0", "Agadir", "Appartement", 1450000, 91),
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
    await page.route("**/api/search?**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ listings: [], total: 0, limit: 100, offset: 0, source: "scale-1-ci", generated_at: new Date().toISOString() }) }));
    await page.route("**/api/search/gateway?**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, degraded: false, provider: "fixture", sources_queried: ["fixture-source"], results_count: externalResults.length, results: externalResults }) }));
    try {
      const response = await page.goto(`${baseUrl}/search?q=immobilier`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      if (!response || response.status() >= 400) throw new Error(`${viewport.name}: search returned ${response?.status() ?? "no response"}`);
      await page.waitForSelector('[data-search-external-mobile-grid] [data-unified-listing-card]', { timeout: 20_000 });
      await hydrateLazyVisuals(page);
      const metrics = await readMetrics(page);
      if (metrics.cardCount !== 27) throw new Error(`${viewport.name}: expected 27 cards, got ${metrics.cardCount}`);
      if (metrics.scrollWidth > metrics.clientWidth || metrics.clippedLabels || metrics.clippedPrices) throw new Error(`${viewport.name}: overflow or clipping`);
      const scale = metrics.visualState.slice(0, 24);
      const uniqueScaleIds = new Set(scale.map((state) => state.contextualAssetId));
      if (uniqueScaleIds.size !== 24) throw new Error(`${viewport.name}: expected 24 unique scale assets, got ${uniqueScaleIds.size}`);
      const ids = [...uniqueScaleIds].sort();
      if (JSON.stringify(ids) !== JSON.stringify(EXPECTED_SCALE_IDS)) throw new Error(`${viewport.name}: scale asset set drift`);
      if (scale.some((state) => !["Marrakech", "Casablanca"].includes(state.contextualCity) || state.illustrationLabel !== "Illustration")) throw new Error(`${viewport.name}: scale disclosure/city drift`);
      for (const offset of [0, 12]) {
        if (scale.slice(offset, offset + 8).some((state) => state.contextualTier !== "city_type")) throw new Error(`${viewport.name}: apartment/villa tier drift`);
        if (scale.slice(offset + 8, offset + 12).some((state) => state.contextualTier !== "city")) throw new Error(`${viewport.name}: generic city tier drift`);
      }
      if (metrics.visualState[24]?.contextualCity !== "Agadir" || !metrics.visualState[24]?.contextualAssetId?.startsWith("agadir-")) throw new Error(`${viewport.name}: Agadir predecessor drift`);
      if (metrics.visualState[25]?.contextualAssetId !== null || metrics.visualState[25]?.neutral) throw new Error(`${viewport.name}: property artwork fallback drift`);
      if (!metrics.visualState[26]?.neutral) throw new Error(`${viewport.name}: neutral fallback drift`);
      if (metrics.visualState.some((state) => state.illustrationLabel !== "Illustration")) throw new Error(`${viewport.name}: disclosure drift`);
      const stableIds = metrics.visualState.map((state) => state.contextualAssetId);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForSelector('[data-search-external-mobile-grid] [data-unified-listing-card]', { timeout: 20_000 });
      await hydrateLazyVisuals(page);
      const reloaded = await readMetrics(page);
      if (JSON.stringify(reloaded.visualState.map((state) => state.contextualAssetId)) !== JSON.stringify(stableIds)) throw new Error(`${viewport.name}: asset changed after reload`);
      if (reloaded.scrollWidth > reloaded.clientWidth || reloaded.clippedLabels || reloaded.clippedPrices) throw new Error(`${viewport.name}: reload layout drift`);
      await page.screenshot({ path: `${outputDir}/${viewport.name}.png`, fullPage: true });
      results.push({ name: viewport.name, unique_scale_assets: uniqueScaleIds.size, stable_after_reload: true, lazy_visuals_hydrated: true, clipped_labels: 0, clipped_prices: 0, horizontal_overflow: false });
    } catch (error) { failure = error; break; } finally { await page.close(); }
  }
} finally { await browser.close(); }
await writeFile(`${outputDir}/metrics.json`, `${JSON.stringify({ generated_at: new Date().toISOString(), results, failure: failure instanceof Error ? failure.message : null }, null, 2)}\n`, "utf8");
console.log(JSON.stringify(results, null, 2));
if (failure) throw failure;
