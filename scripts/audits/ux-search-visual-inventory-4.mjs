import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3105";
const variant = process.env.AUDIT_VARIANT ?? "product-design";
const outDir = process.env.AUDIT_DIR ?? path.join("data", "audits", "ux-search-visual-inventory-4", variant);
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800, columns: 2, topMax: 270, cardMax: 390 },
  { name: "mobile-390x844", width: 390, height: 844, columns: 2, topMax: 270, cardMax: 390 },
  { name: "tablet-768x900", width: 768, height: 900, columns: 2, topMax: 285, cardMax: 620 },
  { name: "desktop-1024x800", width: 1024, height: 800, columns: 3, topMax: 280, cardMax: 420 },
  { name: "desktop-1280x900", width: 1280, height: 900, columns: 4, topMax: 280, cardMax: 420 },
  { name: "desktop-1440x900", width: 1440, height: 900, columns: 4, topMax: 280, cardMax: 420 },
];

const cityPairs = [
  ["Agadir", "Appartement"], ["Agadir", "Villa"],
  ["Marrakech", "Appartement"], ["Marrakech", "Villa"],
  ["Casablanca", "Appartement"], ["Casablanca", "Villa"],
  ["Rabat", "Appartement"], ["Rabat", "Villa"],
  ["Tanger", "Appartement"], ["Tanger", "Villa"],
  ["Fès", "Appartement"], ["Fès", "Villa"],
];

const listings = cityPairs.map(([city, propertyType], index) => ({
  id: `ux-search-visual-inventory-4-${index + 1}`,
  title: `${propertyType} de certification visuelle à ${city}`,
  city,
  neighborhood: city === "Rabat" && index === 6 ? "Agdal" : city === "Rabat" ? "Quartier non certifié" : undefined,
  price: 1250000 + index * 125000,
  currency: "DH",
  surface_m2: 72 + index * 7,
  price_per_m2: 16500,
  property_type: propertyType,
  transaction_type: "buy",
  bedrooms: 2,
  bathrooms: 1,
  freshness_label: "Récent",
  source_type: "Source analysée",
  reliability_label: "Informations complètes",
  reliability_score: 88,
  reliability_available: true,
  is_mre_friendly: false,
  description: "Fixture déterministe UX-SEARCH-4.",
  image_url: "",
  reliability_explanation: "Fixture CI",
  data_completeness_score: 90,
  source_name: "AkarFinder",
  duplicate_score: 0.1,
  listing_url: `https://fixture.example/${encodeURIComponent(city)}/${propertyType.toLowerCase()}/${index}`,
  can_show_result: true,
  production_allowed: true,
  can_show_thumbnail: false,
  display_images: { policy: "no_listing_image", urls: [] },
  image_permission_status: "unknown",
  source_access_level: "indexed_only",
  acquisition_channel: "first_party_user",
  origin_type: "first_party_user",
}));

listings.push(
  {
    ...listings[0],
    id: "ux-search-visual-inventory-4-oujda",
    title: "Appartement de contrôle hors allowlist à Oujda",
    city: "Oujda",
    neighborhood: undefined,
    property_type: "Appartement",
    listing_url: "https://fixture.example/oujda/appartement/1",
  },
  {
    ...listings[0],
    id: "ux-search-visual-inventory-4-meknes",
    title: "Maison de contrôle hors allowlist à Meknès",
    city: "Meknès",
    neighborhood: undefined,
    property_type: "Maison",
    listing_url: "https://fixture.example/meknes/maison/1",
  },
);

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const failures = [];

async function captureVisualKeys(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll("article[data-property-active]")).slice(0, 14).map((card) => {
    const marker = card.querySelector('[data-visual-inventory-class]');
    return {
      visualClass: marker?.getAttribute('data-visual-inventory-class') ?? null,
      contextualId: card.querySelector('[data-contextual-asset-id]')?.getAttribute('data-contextual-asset-id') ?? null,
      neighborhoodId: card.querySelector('[data-neighborhood-photo-id]')?.getAttribute('data-neighborhood-photo-id') ?? null,
    };
  }));
}

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  await page.route("https://commons.wikimedia.org/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="960" height="540" fill="#7593a8"/><path d="M0 360L220 180l180 150 170-130 390 340H0z" fill="#d9c8a3"/></svg>',
    });
  });
  await page.route("**/api/search?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ listings, total: listings.length, limit: 100, offset: 0, source: "ux-search-4-ci", generated_at: new Date().toISOString() }),
    });
  });
  await page.route("**/api/search/gateway?**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: [], total_count: 0, next_cursor: null, has_more: false }) });
  });

  const response = await page.goto(`${baseUrl}/search?view=list`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!response || response.status() >= 400) failures.push(`${viewport.name}: search route returned ${response?.status() ?? "no response"}`);
  await page.waitForFunction(() => document.querySelectorAll("article[data-property-active]").length >= 14, null, { timeout: 30_000 });
  await page.waitForTimeout(500);

  const initialKeys = await captureVisualKeys(page);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForFunction(() => document.querySelectorAll("article[data-property-active]").length >= 14, null, { timeout: 30_000 });
  await page.waitForTimeout(350);
  const replayKeys = await captureVisualKeys(page);

  const metrics = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll("article[data-property-active]")).slice(0, 14);
    const grid = document.querySelector("[data-search-continuous-flow] > div.grid");
    const classes = cards.map((card) => card.querySelector('[data-visual-inventory-class]')?.getAttribute('data-visual-inventory-class') ?? null);
    const contextualIds = cards.map((card) => card.querySelector('[data-contextual-asset-id]')?.getAttribute('data-contextual-asset-id') ?? null).filter(Boolean);
    const neighborhoodIds = cards.map((card) => card.querySelector('[data-neighborhood-photo-id]')?.getAttribute('data-neighborhood-photo-id') ?? null).filter(Boolean);
    const labels = cards.map((card) => ({
      illustration: card.querySelector('[data-contextual-illustration-label]')?.textContent?.trim() ?? null,
      neighborhood: card.querySelector('[data-neighborhood-photo-disclosure]')?.textContent?.trim() ?? null,
      fullText: card.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    }));
    const brokenImages = cards.flatMap((card) => Array.from(card.querySelectorAll('[data-card-image] img'))).filter((img) => !(img.complete && img.naturalWidth > 0)).length;
    const heights = cards.map((card) => Math.round(card.getBoundingClientRect().height * 10) / 10);
    const firstTop = cards[0] ? Math.round(cards[0].getBoundingClientRect().top * 10) / 10 : null;
    return {
      cardCount: cards.length,
      classes,
      contextualIds,
      neighborhoodIds,
      labels,
      brokenImages,
      maxCardHeight: Math.max(...heights),
      firstTop,
      columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    };
  });

  const counts = Object.fromEntries(["authorized_or_listing_image", "neighborhood_photo", "contextual_illustration", "generic_illustration", "neutral"].map((key) => [key, metrics.classes.filter((value) => value === key).length]));
  if (metrics.cardCount !== 14) failures.push(`${viewport.name}: expected 14 cards, got ${metrics.cardCount}`);
  if (metrics.columns !== viewport.columns) failures.push(`${viewport.name}: expected ${viewport.columns} columns, got ${metrics.columns}`);
  if (metrics.firstTop == null || metrics.firstTop > viewport.topMax) failures.push(`${viewport.name}: first listing top ${metrics.firstTop}px > ${viewport.topMax}px`);
  if (metrics.maxCardHeight > viewport.cardMax) failures.push(`${viewport.name}: card height ${metrics.maxCardHeight}px > ${viewport.cardMax}px`);
  if (metrics.overflow > 1) failures.push(`${viewport.name}: horizontal overflow ${metrics.overflow}px`);
  if (metrics.brokenImages !== 0) failures.push(`${viewport.name}: ${metrics.brokenImages} broken visual(s)`);
  if (counts.neighborhood_photo !== 1) failures.push(`${viewport.name}: expected 1 neighborhood photo, got ${counts.neighborhood_photo}`);
  if (counts.contextual_illustration !== 11) failures.push(`${viewport.name}: expected 11 contextual illustrations, got ${counts.contextual_illustration}`);
  if (counts.generic_illustration !== 2) failures.push(`${viewport.name}: expected 2 generic illustrations, got ${counts.generic_illustration}`);
  if (counts.authorized_or_listing_image !== 0 || counts.neutral !== 0) failures.push(`${viewport.name}: unexpected authorized/neutral visual class`);
  if (new Set(metrics.contextualIds).size !== 11) failures.push(`${viewport.name}: contextual inventory is not visually distinct across the 11 contextual fixtures`);
  if (new Set(metrics.neighborhoodIds).size !== 1) failures.push(`${viewport.name}: Rabat neighborhood photo precedence missing`);
  if (JSON.stringify(initialKeys) !== JSON.stringify(replayKeys)) failures.push(`${viewport.name}: deterministic visual assignment drifted after reload`);
  const contextualDisclosureCount = metrics.labels.filter((item) => item.illustration === "Illustration").length;
  const neighborhoodDisclosureCount = metrics.labels.filter((item) => item.neighborhood === "Photo d’ambiance").length;
  const genericDisclosureCount = metrics.labels.filter((item) => item.fullText.includes("Visuel illustratif")).length;
  if (contextualDisclosureCount !== 11) failures.push(`${viewport.name}: contextual disclosure count ${contextualDisclosureCount}/11`);
  if (neighborhoodDisclosureCount !== 1) failures.push(`${viewport.name}: neighborhood disclosure count ${neighborhoodDisclosureCount}/1`);
  if (genericDisclosureCount < 2) failures.push(`${viewport.name}: generic illustration disclosure missing`);

  const screenshot = path.join(outDir, `${viewport.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  results.push({ ...viewport, ...metrics, counts, stableAfterReload: JSON.stringify(initialKeys) === JSON.stringify(replayKeys), screenshot });
  await context.close();
}

await browser.close();

const scoreParts = {
  truthSafety: failures.filter((x) => x.includes("disclosure") || x.includes("authorized/neutral") || x.includes("precedence")).length === 0 ? 2.5 : 0,
  contextualCoverage: failures.filter((x) => x.includes("contextual illustrations") || x.includes("visually distinct")).length === 0 ? 2.5 : 0,
  stability: failures.filter((x) => x.includes("reload")).length === 0 ? 1.5 : 0,
  responsiveDensity: failures.filter((x) => x.includes("columns") || x.includes("first listing") || x.includes("card height")).length === 0 ? 2 : 0,
  visualIntegrity: failures.filter((x) => x.includes("broken") || x.includes("overflow")).length === 0 ? 1.5 : 0,
};
const score = Object.values(scoreParts).reduce((sum, value) => sum + value, 0);
const report = { variant, baseUrl, fixtureCount: listings.length, score, scoreParts, failures, viewports: results };
await fs.writeFile(path.join(outDir, "metrics.json"), JSON.stringify(report, null, 2));
await fs.writeFile(path.join(outDir, "report.md"), `# UX-SEARCH-4 Visual Inventory System — ${variant}\n\nScore contract: **${score.toFixed(1)}/10**\n\n${failures.length ? failures.map((item) => `- FAIL: ${item}`).join("\n") : "- PASS: truth-safe precedence, contextual coverage, reload stability, density and visual integrity all pass."}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length || score < 9) process.exit(1);
