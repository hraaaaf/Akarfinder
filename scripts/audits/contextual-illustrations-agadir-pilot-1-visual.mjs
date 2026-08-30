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
const base = {
  neighborhood: "", currency: "DH", price_per_m2: null, transaction_type: "buy", bedrooms: 0, bathrooms: 0,
  freshness_label: "Récent", source_type: "Source analysée", reliability_label: "Informations complètes", reliability_score: 90,
  reliability_available: true, is_mre_friendly: false, description: "Fixture déterministe Agadir.", image_url: "", reliability_explanation: "Fixture CI",
  source_name: "AkarFinder", acquisition_channel: "first_party_user", origin_type: "first_party_user", can_show_result: true, production_allowed: true,
  can_show_thumbnail: false, image_permission_status: "unknown", source_access_level: "indexed_only", display_images: { policy: "no_listing_image", urls: [] },
};
const make = (id, listing_url, city, property_type, price, surface_m2) => ({ ...base, id, title: `${property_type} à ${city}`, listing_url, city, property_type, price, surface_m2 });
const listings = [
  make("a0", "https://example.com/agadir/appartement/0", "Agadir", "Appartement", 1450000, 91), make("a1", "https://example.com/agadir/appartement/1", "Agadir", "Appartement", 1680000, 104), make("a2", "https://example.com/agadir/appartement/2", "Agadir", "Appartement", 1930000, 118), make("a3", "https://example.com/agadir/appartement/3", "Agadir", "Appartement", 2210000, 132),
  make("v0", "https://example.com/agadir/villa/0", "Agadir", "Villa", 4700000, 310), make("v1", "https://example.com/agadir/villa/1", "Agadir", "Villa", 5900000, 360), make("v2", "https://example.com/agadir/villa/2", "Agadir", "Villa", 7100000, 410), make("v3", "https://example.com/agadir/villa/3", "Agadir", "Villa", 8500000, 470),
  make("c0", "https://example.com/agadir/maison/0", "Agadir", "Maison", 2800000, 180), make("c1", "https://example.com/agadir/maison/3", "Agadir", "Maison", 3100000, 205), make("c2", "https://example.com/agadir/maison/5", "Agadir", "Maison", 3400000, 225), make("c3", "https://example.com/agadir/maison/6", "Agadir", "Maison", 3750000, 248),
  make("type-only", "https://example.com/oujda/villa", "Oujda", "Villa", 2400000, 280),
  { ...base, id: "neutral", title: "Bien à confirmer", listing_url: "https://example.com/neutral", city: "", property_type: null, price: null, surface_m2: 0 },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
let failure = null;
const readMetrics = (page) => page.evaluate(() => {
  const cards = [...document.querySelectorAll('[data-search-listing-card]')];
  const text = (node) => (node?.innerText ?? node?.textContent ?? "").replace(/\s+/g, " ").trim();
  const visualState = cards.map((card) => ({ contextualCity: card.querySelector('[data-contextual-city]')?.getAttribute('data-contextual-city') ?? null, contextualAssetId: card.querySelector('[data-contextual-asset-id]')?.getAttribute('data-contextual-asset-id') ?? null, contextualTier: card.querySelector('[data-contextual-tier]')?.getAttribute('data-contextual-tier') ?? null, contextualLabel: text(card.querySelector('[data-contextual-illustration-label]')), generic: Boolean(card.querySelector('[data-visual-inventory-class="generic_illustration"]')), text: text(card) }));
  return { cardCount: cards.length, visualState, clippedLabels: cards.map((card) => card.querySelector('[data-contextual-illustration-label]')).filter((node) => node && node.scrollWidth > node.clientWidth + 1).length, clippedPrices: cards.map((card) => card.querySelector('[data-mobile-price]')).filter((node) => node && node.scrollWidth > node.clientWidth + 1).length, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth };
});
async function hydrate(page) {
  for (const card of await page.locator('[data-search-listing-card]').all()) { await card.scrollIntoViewIfNeeded(); await page.waitForTimeout(20); }
  await page.waitForFunction(() => [...document.querySelectorAll('[data-search-listing-card] img')].every((img) => img.complete && img.naturalWidth > 0), { timeout: 15_000 });
  await page.evaluate(() => scrollTo(0, 0));
}
try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.route("**/api/search?**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ listings, total: listings.length, limit: 100, offset: 0, source: "agadir-pilot-ci", generated_at: new Date().toISOString() }) }));
    try {
      const response = await page.goto(`${baseUrl}/search?q=agadir`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      if (!response || response.status() >= 400) throw new Error(`${viewport.name}: search returned ${response?.status() ?? "no response"}`);
      await page.waitForSelector('[data-search-listing-card]', { timeout: 20_000 });
      await hydrate(page);
      const metrics = await readMetrics(page);
      if (metrics.cardCount !== 14) throw new Error(`${viewport.name}: expected 14 cards, got ${metrics.cardCount}`);
      if (metrics.scrollWidth > metrics.clientWidth) throw new Error(`${viewport.name}: horizontal overflow ${metrics.scrollWidth}/${metrics.clientWidth}`);
      if (metrics.clippedLabels) throw new Error(`${viewport.name}: contextual illustration label clipping`);
      const pilot = metrics.visualState.slice(0, 12);
      const uniqueAssetIds = new Set(pilot.map((state) => state.contextualAssetId));
      const ids = [...uniqueAssetIds].sort();
      if (uniqueAssetIds.size !== 12 || JSON.stringify(ids) !== JSON.stringify(EXPECTED_ASSET_IDS)) throw new Error(`${viewport.name}: Agadir asset set drift`);
      if (pilot.some((state) => state.contextualCity !== "Agadir" || state.contextualLabel !== "Illustration")) throw new Error(`${viewport.name}: Agadir disclosure/city drift`);
      if (pilot.slice(0, 8).some((state) => state.contextualTier !== "city_type")) throw new Error(`${viewport.name}: apartment/villa tier drift`);
      if (pilot.slice(8, 12).some((state) => state.contextualTier !== "city")) throw new Error(`${viewport.name}: generic city tier drift`);
      for (const fallback of metrics.visualState.slice(12, 14)) if (fallback.contextualAssetId !== null || !fallback.generic || !fallback.text.includes("Visuel illustratif")) throw new Error(`${viewport.name}: generic fallback drift`);
      const stable = metrics.visualState.map((state) => state.contextualAssetId);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForSelector('[data-search-listing-card]', { timeout: 20_000 });
      await hydrate(page);
      const reloaded = await readMetrics(page);
      if (JSON.stringify(reloaded.visualState.map((state) => state.contextualAssetId)) !== JSON.stringify(stable)) throw new Error(`${viewport.name}: asset changed after reload`);
      if (reloaded.scrollWidth > reloaded.clientWidth || reloaded.clippedLabels) throw new Error(`${viewport.name}: reload contextual layout drift`);
      await page.screenshot({ path: `${outputDir}/${viewport.name}.png`, fullPage: true });
      results.push({ name: viewport.name, unique_agadir_assets: uniqueAssetIds.size, stable_after_reload: true, lazy_visuals_hydrated: true, clipped_labels: metrics.clippedLabels, clipped_prices: metrics.clippedPrices, horizontal_overflow: false });
    } catch (error) { failure = error; break; } finally { await page.close(); }
  }
} finally { await browser.close(); }
await writeFile(`${outputDir}/metrics.json`, `${JSON.stringify({ generated_at: new Date().toISOString(), results, failure: failure instanceof Error ? failure.message : null }, null, 2)}\n`, "utf8");
console.log(JSON.stringify(results, null, 2));
if (failure) throw failure;
