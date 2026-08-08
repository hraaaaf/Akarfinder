import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.SEARCH_WORDING_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = "data/audits/search-wording-purity-1";
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "desktop-1280x800", width: 1280, height: 800 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
];

const retiredSearchPhrases = [
  "Annonces publiques indexées",
  "Analysé par AkarFinder",
  "Analyse partielle",
  "Offres observées sur le web",
  "Offre observée",
  "Aperçu limité",
  "fiches indexées actuellement affichées",
  "éligibilité",
];
const retiredHomePhrases = [
  "Niveau d’information visible",
  "niveau d’information",
  "Provenance",
  "Une lecture plus transparente",
];

const fixtureListing = {
  id: "search-wording-purity-1-fixture",
  title: "Appartement lumineux à Rabat",
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
  source_type: "Source analysée",
  reliability_label: "Informations complètes",
  reliability_score: 88,
  reliability_available: true,
  is_mre_friendly: false,
  description: "Fixture déterministe de certification visuelle.",
  image_url: "",
  reliability_explanation: "Fixture CI",
  data_completeness_score: 90,
  source_name: "AkarFinder",
  duplicate_score: 0.1,
  can_show_result: true,
  production_allowed: true,
  can_show_thumbnail: false,
  display_images: { policy: "no_listing_image", urls: [] },
  image_permission_status: "unknown",
  source_access_level: "indexed_only",
  acquisition_channel: "first_party_user",
  origin_type: "first_party_user",
};

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
let failure = null;

function findRetired(bodyText, phrases) {
  return phrases.filter((phrase) => bodyText.toLowerCase().includes(phrase.toLowerCase()));
}

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.route("**/api/search?**", async (requestRoute) => {
      await requestRoute.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          listings: [fixtureListing],
          total: 1,
          limit: 100,
          offset: 0,
          source: "search-wording-purity-1-ci-fixture",
          generated_at: new Date().toISOString(),
        }),
      });
    });
    await page.route("**/api/search/gateway?**", async (requestRoute) => {
      await requestRoute.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ results: [], total_count: 0, next_cursor: null, has_more: false }),
      });
    });

    try {
      const searchResponse = await page.goto(`${baseUrl}/search?q=appartement%20rabat`, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      if (!searchResponse || searchResponse.status() >= 400) {
        throw new Error(`${viewport.name}: search returned ${searchResponse?.status() ?? "no response"}`);
      }
      await page.waitForSelector('article[data-property-active]', { timeout: 20_000 });
      const searchMetrics = await page.evaluate(() => {
        const first = document.querySelector('article[data-property-active]');
        const rect = first?.getBoundingClientRect();
        return {
          bodyText: document.body.innerText,
          firstResultTop: rect ? Math.round(rect.top) : null,
          firstResultVisible: rect ? rect.top < window.innerHeight : false,
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });
      const searchRetired = findRetired(searchMetrics.bodyText, retiredSearchPhrases);
      const searchOverflow = searchMetrics.scrollWidth > searchMetrics.clientWidth;
      await page.screenshot({ path: `${outputDir}/${viewport.name}-search.png`, fullPage: true });
      if (searchRetired.length) throw new Error(`${viewport.name}: retired Search wording: ${searchRetired.join(", ")}`);
      if (searchOverflow) throw new Error(`${viewport.name}: Search horizontal overflow ${searchMetrics.scrollWidth}/${searchMetrics.clientWidth}`);
      if (!searchMetrics.firstResultVisible) throw new Error(`${viewport.name}: first Search result below viewport at ${searchMetrics.firstResultTop}px`);

      const homeResponse = await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      if (!homeResponse || homeResponse.status() >= 400) {
        throw new Error(`${viewport.name}: home returned ${homeResponse?.status() ?? "no response"}`);
      }
      const homeMetrics = await page.evaluate(() => ({
        bodyText: document.body.innerText,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      const homeRetired = findRetired(homeMetrics.bodyText, retiredHomePhrases);
      const homeOverflow = homeMetrics.scrollWidth > homeMetrics.clientWidth;
      await page.screenshot({ path: `${outputDir}/${viewport.name}-home.png`, fullPage: true });
      if (homeRetired.length) throw new Error(`${viewport.name}: retired Home wording: ${homeRetired.join(", ")}`);
      if (homeOverflow) throw new Error(`${viewport.name}: Home horizontal overflow ${homeMetrics.scrollWidth}/${homeMetrics.clientWidth}`);

      results.push({
        name: viewport.name,
        search: {
          first_result_top: searchMetrics.firstResultTop,
          first_result_visible: searchMetrics.firstResultVisible,
          horizontal_overflow: searchOverflow,
          retired_phrases: searchRetired,
        },
        home: {
          horizontal_overflow: homeOverflow,
          retired_phrases: homeRetired,
        },
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

await writeFile(
  `${outputDir}/metrics.json`,
  `${JSON.stringify({ generated_at: new Date().toISOString(), results, failure: failure instanceof Error ? failure.message : null }, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify(results, null, 2));
if (failure) throw failure;
