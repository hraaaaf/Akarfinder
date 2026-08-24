import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.CONTEXTUAL_ILLUSTRATIONS_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = "data/audits/contextual-illustrations-foundation-1";
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "tablet-768x900", width: 768, height: 900 },
  { name: "desktop-1280x900", width: 1280, height: 900 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
];

const baseResult = {
  snippet: "Fixture de certification des illustrations contextuelles.",
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
  { ...baseResult, id: "stable-agadir-a", title: "Appartement source à ne pas afficher", original_url: "https://example.com/agadir-a", display_url: "example.com/agadir-a", normalized_city: "Agadir", normalized_property_type: "Appartement", normalized_price_mad: 1850000, normalized_surface_m2: 112 },
  { ...baseResult, id: "stable-agadir-b", title: "Villa source à ne pas afficher", original_url: "https://example.com/agadir-b", display_url: "example.com/agadir-b", normalized_city: "Agadir", normalized_property_type: "Villa", normalized_price_mad: 12450000, normalized_surface_m2: 480 },
  { ...baseResult, id: "type-only", title: "Villa hors ville source à ne pas afficher", original_url: "https://example.com/type-only", display_url: "example.com/type-only", normalized_city: "Oujda", normalized_property_type: "Villa", normalized_price_mad: 2400000, normalized_surface_m2: 280 },
  { ...baseResult, id: "neutral", title: "Titre source neutral à ne pas afficher", original_url: "https://example.com/neutral", display_url: "example.com/neutral" },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
let failure = null;

async function readMetrics(page) {
  return page.evaluate(() => {
    const list = document.querySelector('[data-search-external-serp-list]');
    const cards = [...document.querySelectorAll('[data-search-external-serp-list] [data-external-serp-group]')];
    const text = (node) => (node?.innerText ?? node?.textContent ?? "").replace(/\s+/g, " ").trim();
    const fullText = text(list);
    const sourceLinkCount = cards.reduce((count, card) => count + card.querySelectorAll('a[target="_blank"][rel="noopener noreferrer"]').length, 0);
    const mediaCount = cards.reduce((count, card) => count + card.querySelectorAll('img, picture, video, [data-card-image], [data-contextual-asset-id], [data-contextual-neutral]').length, 0);
    const sourceDomains = cards.map((card) => text(card).includes("example.com"));
    const generatedTitles = cards.map((card) => text(card.querySelector("h3")));
    const disclaimerCount = cards.filter((card) => text(card).includes("AkarFinder indexe la page et vous renvoie vers la source originale.")).length;
    return {
      cardCount: cards.length,
      fullText,
      sourceLinkCount,
      mediaCount,
      sourceDomains,
      generatedTitles,
      disclaimerCount,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
}

function assertTruthSafe(viewportName, metrics) {
  if (metrics.cardCount !== 4) throw new Error(`${viewportName}: expected 4 Option B groups, got ${metrics.cardCount}`);
  if (metrics.scrollWidth > metrics.clientWidth) throw new Error(`${viewportName}: horizontal overflow ${metrics.scrollWidth}/${metrics.clientWidth}`);
  if (metrics.mediaCount !== 0) throw new Error(`${viewportName}: external Option B must remain media-free, got ${metrics.mediaCount} media markers`);
  if (metrics.sourceLinkCount < 4) throw new Error(`${viewportName}: expected at least one original-source link per group, got ${metrics.sourceLinkCount}`);
  if (metrics.disclaimerCount !== 4) throw new Error(`${viewportName}: expected explicit source disclaimer on all 4 groups, got ${metrics.disclaimerCount}`);
  if (metrics.sourceDomains.some((visible) => !visible)) throw new Error(`${viewportName}: source domain missing from one or more groups`);
  for (const forbidden of [
    "1850000",
    "12450000",
    "2400000",
    "112",
    "480",
    "280",
    "Appartement source à ne pas afficher",
    "Villa source à ne pas afficher",
    "Villa hors ville source à ne pas afficher",
    "Titre source neutral à ne pas afficher",
    "Fixture de certification des illustrations contextuelles.",
  ]) {
    if (metrics.fullText.includes(forbidden)) throw new Error(`${viewportName}: forbidden source field leaked into Option B: ${forbidden}`);
  }
}

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.route("**/api/search?**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ listings: [], total: 0, limit: 100, offset: 0, source: "contextual-illustrations-ci", generated_at: new Date().toISOString() }) }));
    await page.route("**/api/search/gateway?**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, degraded: false, provider: "fixture", sources_queried: ["fixture-source"], results_count: 4, results: externalResults }) }));

    try {
      const response = await page.goto(`${baseUrl}/search?q=immobilier`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      if (!response || response.status() >= 400) throw new Error(`${viewport.name}: search returned ${response?.status() ?? "no response"}`);
      await page.waitForSelector('[data-search-external-serp-list] [data-external-serp-group]', { timeout: 20_000 });
      const metrics = await readMetrics(page);
      assertTruthSafe(viewport.name, metrics);

      const stableTitles = metrics.generatedTitles;
      await page.reload({ waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForSelector('[data-search-external-serp-list] [data-external-serp-group]', { timeout: 20_000 });
      const reloadMetrics = await readMetrics(page);
      assertTruthSafe(`${viewport.name} reload`, reloadMetrics);
      if (JSON.stringify(reloadMetrics.generatedTitles) !== JSON.stringify(stableTitles)) throw new Error(`${viewport.name}: generated Option B titles changed after reload`);

      await page.screenshot({ path: `${outputDir}/${viewport.name}.png`, fullPage: true });
      results.push({
        name: viewport.name,
        group_count: metrics.cardCount,
        stable_after_reload: true,
        media_count: metrics.mediaCount,
        source_link_count: metrics.sourceLinkCount,
        disclaimer_count: metrics.disclaimerCount,
        source_domains_visible: metrics.sourceDomains.every(Boolean),
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
