import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.UX_SEARCH_4_PRODUCTION_URL ?? "https://akarfinder.vercel.app";
const outputDir = "data/audits/ux-search-4-production-baseline";
const cities = ["Rabat", "Casablanca", "Marrakech", "Tanger", "Fès", "Agadir"];
const viewports = [
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { generated_at: new Date().toISOString(), base_url: baseUrl, cities: [], summary: {} };

function classifyCard(card) {
  if (card.neighborhoodPhotoId) return "neighborhood_photo";
  if (card.contextualAssetId) return "contextual_illustration";
  if (card.neutral) return "neutral";
  if (card.fallbackDisclosure) return "generic_illustration";
  return "authorized_or_listing_image";
}

try {
  for (const viewport of viewports) {
    for (const city of cities) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      try {
        const response = await page.goto(`${baseUrl}/search?city=${encodeURIComponent(city)}`, {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        });
        if (!response || response.status() >= 400) throw new Error(`${city}/${viewport.name}: HTTP ${response?.status() ?? "none"}`);
        await page.waitForTimeout(1800);
        await page.evaluate(async () => {
          for (let y = 0; y < Math.min(document.body.scrollHeight, 5000); y += 700) {
            window.scrollTo(0, y);
            await new Promise((resolve) => setTimeout(resolve, 120));
          }
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(700);

        const cards = await page.evaluate(() => {
          const nodes = [...document.querySelectorAll('[data-mobile-compact-card], [data-mobile-compact-external-card]')].slice(0, 24);
          const clean = (v) => (v ?? "").replace(/\s+/g, " ").trim();
          return nodes.map((card, index) => {
            const neighborhood = card.querySelector('[data-neighborhood-photo-id]');
            const contextual = card.querySelector('[data-contextual-asset-id]');
            const neutral = card.querySelector('[data-contextual-neutral]');
            const fallbackLabels = [...card.querySelectorAll('span')].map((n) => clean(n.textContent));
            const fallbackDisclosure = fallbackLabels.find((text) => text === "Visuel illustratif" || text === "Illustration" || text === "Photo d’ambiance") ?? null;
            const img = card.querySelector('[data-card-image] img');
            const rect = card.getBoundingClientRect();
            return {
              index,
              kind: card.hasAttribute('data-mobile-compact-external-card') ? 'external' : 'internal',
              top: Math.round(rect.top * 10) / 10,
              height: Math.round(rect.height * 10) / 10,
              neighborhoodPhotoId: neighborhood?.getAttribute('data-neighborhood-photo-id') ?? null,
              contextualAssetId: contextual?.getAttribute('data-contextual-asset-id') ?? null,
              contextualTier: contextual?.getAttribute('data-contextual-tier') ?? null,
              neutral: Boolean(neutral),
              fallbackDisclosure,
              imageSrc: img?.getAttribute('src') ?? null,
              imageLoaded: img ? Boolean(img.complete && img.naturalWidth > 0) : true,
            };
          });
        });

        const classified = cards.map((card) => ({ ...card, visualClass: classifyCard(card) }));
        const counts = Object.fromEntries([
          "authorized_or_listing_image",
          "neighborhood_photo",
          "contextual_illustration",
          "generic_illustration",
          "neutral",
        ].map((key) => [key, classified.filter((card) => card.visualClass === key).length]));
        const contextualIds = classified.map((card) => card.contextualAssetId).filter(Boolean);
        const neighborhoodIds = classified.map((card) => card.neighborhoodPhotoId).filter(Boolean);
        const visibleVisualKeys = classified.map((card) => card.neighborhoodPhotoId || card.contextualAssetId || card.imageSrc || card.visualClass);
        let adjacentDuplicatePairs = 0;
        for (let i = 1; i < visibleVisualKeys.length; i += 1) {
          if (visibleVisualKeys[i] && visibleVisualKeys[i] === visibleVisualKeys[i - 1]) adjacentDuplicatePairs += 1;
        }
        const brokenImages = classified.filter((card) => !card.imageLoaded).length;
        const doc = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));

        const entry = {
          city,
          viewport: viewport.name,
          cardCount: classified.length,
          counts,
          uniqueContextualAssets: new Set(contextualIds).size,
          uniqueNeighborhoodPhotos: new Set(neighborhoodIds).size,
          adjacentDuplicatePairs,
          brokenImages,
          horizontalOverflow: doc.scrollWidth > doc.clientWidth,
          cards: classified,
        };
        report.cities.push(entry);
        await page.screenshot({ path: `${outputDir}/${city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${viewport.name}.png`, fullPage: true });
      } catch (error) {
        report.cities.push({ city, viewport: viewport.name, error: error instanceof Error ? error.message : String(error) });
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

const valid = report.cities.filter((entry) => !entry.error);
const totals = valid.reduce((acc, entry) => {
  acc.cards += entry.cardCount;
  acc.brokenImages += entry.brokenImages;
  acc.adjacentDuplicatePairs += entry.adjacentDuplicatePairs;
  acc.horizontalOverflow += entry.horizontalOverflow ? 1 : 0;
  for (const [key, value] of Object.entries(entry.counts)) acc.counts[key] = (acc.counts[key] ?? 0) + value;
  return acc;
}, { cards: 0, brokenImages: 0, adjacentDuplicatePairs: 0, horizontalOverflow: 0, counts: {} });
report.summary = totals;

await writeFile(`${outputDir}/coverage.json`, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report.summary, null, 2));
if (valid.length === 0) throw new Error("UX-SEARCH-4 production baseline produced no valid city/viewports");
if (totals.brokenImages > 0) throw new Error(`UX-SEARCH-4 baseline: ${totals.brokenImages} broken image(s)`);
if (totals.horizontalOverflow > 0) throw new Error(`UX-SEARCH-4 baseline: horizontal overflow in ${totals.horizontalOverflow} city/viewports`);
