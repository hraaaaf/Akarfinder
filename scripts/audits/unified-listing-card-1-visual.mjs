import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.UNIFIED_LISTING_CARD_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = "data/audits/unified-listing-card-1";
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "tablet-768x900", width: 768, height: 900 },
  { name: "desktop-1280x900", width: 1280, height: 900 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
];

const externalResults = [
  {
    id: "external-rich-1",
    title: "Appartement lumineux à Agdal",
    snippet: "Fixture externe déterministe.",
    original_url: "https://example.com/annonce/rich-1",
    display_url: "example.com/annonce/rich-1",
    source_id: "agenz",
    source_name: "RAW LABEL MUST NOT RENDER",
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
    normalized_city: "Rabat",
    normalized_property_type: "Appartement",
    normalized_intent: "buy",
    normalized_price_mad: 1850000,
    normalized_surface_m2: 112,
  },
  {
    id: "external-unknown-2",
    title: "Bien immobilier à confirmer",
    snippet: "Fixture sans prix ni localisation normalisés.",
    original_url: "https://example.org/annonce/unknown-2",
    display_url: "example.org/annonce/unknown-2",
    source_id: "mubawab_serper",
    source_name: "RAW SECOND LABEL MUST NOT RENDER",
    domain: "example.org",
    result_origin: "search_api",
    search_result_display_mode: "thin_indexed_result",
    source_badge: "external_indexed",
    production_allowed: true,
    can_show_result: true,
    can_show_thumbnail: false,
    can_show_contact: false,
    can_show_gallery: false,
    can_cache_thumbnail: false,
    can_download_thumbnail: false,
    primary_cta: "view_original",
    primary_cta_label: "Voir sur le site d’origine",
    result_attribution_label: "Résultat externe",
    thumbnail_risk_accepted: false,
  },
  {
    id: "external-rent-3",
    title: "Villa en location à Souissi",
    snippet: "Fixture location.",
    original_url: "https://example.net/annonce/rent-3",
    display_url: "example.net/annonce/rent-3",
    source_id: "logic-immo",
    source_name: "RAW THIRD LABEL MUST NOT RENDER",
    domain: "example.net",
    result_origin: "commoncrawl_cdx",
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
    normalized_city: "Rabat",
    normalized_property_type: "Villa",
    normalized_intent: "rent",
    normalized_price_mad: 18000,
    normalized_surface_m2: 320,
  },
  {
    id: "external-land-4",
    title: "Terrain à Marrakech",
    snippet: "Fixture terrain.",
    original_url: "https://example.ma/annonce/land-4",
    display_url: "example.ma/annonce/land-4",
    source_id: "agenz",
    source_name: "RAW FOURTH LABEL MUST NOT RENDER",
    domain: "example.ma",
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
    normalized_city: "Marrakech",
    normalized_property_type: "Terrain",
    normalized_intent: "buy",
    normalized_price_mad: 920000,
    normalized_surface_m2: 250,
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
        body: JSON.stringify({ listings: [], total: 0, limit: 100, offset: 0, source: "unified-card-ci", generated_at: new Date().toISOString() }),
      });
    });
    await page.route("**/api/search/gateway?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          degraded: false,
          provider: "fixture",
          sources_queried: ["fixture-source"],
          results_count: externalResults.length,
          results: externalResults,
        }),
      });
    });

    try {
      const response = await page.goto(`${baseUrl}/search?q=immobilier`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      if (!response || response.status() >= 400) throw new Error(`${viewport.name}: search returned ${response?.status() ?? "no response"}`);
      await page.waitForSelector('[data-search-external-serp-list] [data-external-serp-group]', { timeout: 20_000 });

      const metrics = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('[data-search-external-serp-list] [data-external-serp-group]')];
        const text = (node) => (node?.textContent ?? "").replace(/\s+/g, " ").trim();
        const firstCard = cards[0];
        const unknownCard = cards[1];
        const firstText = text(firstCard);
        const unknownText = text(unknownCard);
        const firstAction = firstCard?.querySelector('a[target="_blank"], button[aria-controls]');
        const disclaimer = [...(firstCard?.querySelectorAll("p") ?? [])].find((node) => text(node).includes("AkarFinder indexe la page"));
        const disclaimerBeforeAction = Boolean(disclaimer && firstAction && (disclaimer.compareDocumentPosition(firstAction) & Node.DOCUMENT_POSITION_FOLLOWING));
        const rawPayloadLeak = cards.some((card) => /RAW .*LABEL MUST NOT RENDER/.test(text(card)));
        const thirdPartyImage = cards.some((card) => Boolean(card.querySelector("img")));
        const indexedArtworkCount = cards.filter((card) => card.getAttribute("data-indexed-artwork-card") === "true").length;

        return {
          cardCount: cards.length,
          firstText,
          unknownText,
          disclaimerBeforeAction,
          rawPayloadLeak,
          thirdPartyImage,
          indexedArtworkCount,
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      const overflow = metrics.scrollWidth > metrics.clientWidth;
      const compactPriceText = metrics.firstText.replace(/[.\s\u00a0\u202f]/g, "");
      await page.screenshot({ path: `${outputDir}/${viewport.name}.png`, fullPage: true });

      if (metrics.cardCount !== 4) throw new Error(`${viewport.name}: expected 4 external cards, got ${metrics.cardCount}`);
      if (overflow) throw new Error(`${viewport.name}: horizontal overflow ${metrics.scrollWidth}/${metrics.clientWidth}`);
      if (!metrics.disclaimerBeforeAction) throw new Error(`${viewport.name}: index-only disclaimer must precede source action`);
      if (!compactPriceText.includes("1850000DH")) throw new Error(`${viewport.name}: normalized verified-layer price is not visible`);
      if (!metrics.firstText.includes("Rabat") || !metrics.firstText.includes("Appartement")) throw new Error(`${viewport.name}: normalized city/property type are not visible`);
      if (!metrics.firstText.includes("example.com") || !metrics.firstText.includes("Ouvrir la source")) throw new Error(`${viewport.name}: deterministic source domain/action are not visible`);
      if (metrics.rawPayloadLeak) throw new Error(`${viewport.name}: raw source payload label leaked into public attribution`);
      if (metrics.thirdPartyImage) throw new Error(`${viewport.name}: third-party image rendered in indexed external result`);
      if (metrics.indexedArtworkCount !== 4) throw new Error(`${viewport.name}: expected deterministic AkarFinder artwork on all indexed cards`);
      if (!metrics.unknownText.includes("Bien immobilier") || !metrics.unknownText.includes("example.org")) throw new Error(`${viewport.name}: fail-closed unknown result is not legible`);
      if (metrics.unknownText.includes("RAW SECOND LABEL MUST NOT RENDER")) throw new Error(`${viewport.name}: unknown raw source label leaked`);

      results.push({
        name: viewport.name,
        card_count: metrics.cardCount,
        disclaimer_before_action: metrics.disclaimerBeforeAction,
        indexed_artwork_count: metrics.indexedArtworkCount,
        raw_payload_leak: metrics.rawPayloadLeak,
        third_party_image: metrics.thirdPartyImage,
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
