import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3103";
const variant = process.env.AUDIT_VARIANT ?? "product-design";
const outDir = process.env.AUDIT_DIR ?? path.join("data", "audits", "ux-search-card-architecture-3", variant);

const viewports = [
  { name: "mobile-360x800", width: 360, height: 800, columns: 2, topMax: 270, cardMax: 390 },
  { name: "mobile-390x844", width: 390, height: 844, columns: 2, topMax: 270, cardMax: 390 },
  { name: "tablet-768x900", width: 768, height: 900, columns: 2, topMax: 285, cardMax: 620 },
  { name: "desktop-1024x800", width: 1024, height: 800, columns: 3, topMax: 280, cardMax: 420 },
  { name: "desktop-1280x900", width: 1280, height: 900, columns: 4, topMax: 280, cardMax: 420 },
  { name: "desktop-1440x900", width: 1440, height: 900, columns: 4, topMax: 280, cardMax: 420 },
];

const districts = ["Agdal", "Hay Riad", "Océan", "Hassan", "Souissi", "Agdal", "Hay Riad", "Océan"];
const propertyTypes = ["Appartement", "Villa", "Appartement", "Bureau", "Terrain", "Studio", "Maison", "Appartement"];
const titles = [
  "Appartement lumineux proche des commerces et transports",
  "Villa moderne avec jardin dans un secteur résidentiel calme",
  "Appartement rénové à proximité de la corniche",
  "Bureau central avec espaces de travail modulables",
  "Terrain résidentiel bien situé à Rabat",
  "Studio compact et lumineux au cœur d’Agdal",
  "Maison familiale avec terrasse à Hay Riad",
  "Appartement avec terrasse et double orientation",
];

const listings = Array.from({ length: 8 }, (_, index) => ({
  id: `ux-search-card-architecture-3-${index + 1}`,
  title: titles[index],
  city: "Rabat",
  neighborhood: districts[index],
  price: 1450000 + index * 275000,
  currency: "DH",
  surface_m2: 72 + index * 18,
  price_per_m2: 16518,
  property_type: propertyTypes[index],
  transaction_type: "buy",
  bedrooms: index % 3 === 0 ? 3 : 2,
  bathrooms: index % 2 === 0 ? 2 : 1,
  freshness_label: index % 2 === 0 ? "Récent" : "Mis à jour récemment",
  source_type: "Source analysée",
  reliability_label: "Informations complètes",
  reliability_score: 88,
  reliability_available: true,
  is_mre_friendly: false,
  description: "Fixture déterministe de certification UX-SEARCH-3.",
  image_url: "",
  reliability_explanation: "Fixture CI",
  data_completeness_score: 90,
  source_name: "AkarFinder",
  duplicate_score: index === 7 ? 0.72 : 0.1,
  can_show_result: true,
  production_allowed: true,
  can_show_thumbnail: false,
  display_images: { policy: "no_listing_image", urls: [] },
  image_permission_status: "unknown",
  source_access_level: "indexed_only",
  acquisition_channel: "first_party_user",
  origin_type: "first_party_user",
}));

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const failures = [];

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  await page.route("**/api/search?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        listings,
        total: listings.length,
        limit: 100,
        offset: 0,
        source: "ux-search-card-architecture-3-ci-fixture",
        generated_at: new Date().toISOString(),
      }),
    });
  });
  await page.route("**/api/search/gateway?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ results: [], total_count: 0, next_cursor: null, has_more: false }),
    });
  });

  const response = await page.goto(`${baseUrl}/search?city=Rabat&view=list`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!response || response.status() >= 400) failures.push(`${viewport.name}: search route returned ${response?.status() ?? "no response"}`);
  await page.waitForFunction(() => document.querySelectorAll("article[data-property-active]").length >= 8, null, { timeout: 30_000 });
  await page.waitForTimeout(350);

  const metrics = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll("article[data-property-active]")).slice(0, 8);
    const grid = document.querySelector("[data-search-continuous-flow] > div.grid");
    const first = cards[0] ?? null;
    const order = ["image", "price", "title", "location", "facts", "provenance"];

    const cardMetrics = cards.map((card) => {
      const positions = {};
      let hierarchy = true;
      let previous = -Infinity;
      for (const key of order) {
        const element = card.querySelector(`[data-card-${key}]`);
        if (!element) {
          hierarchy = false;
          positions[key] = null;
          continue;
        }
        const top = element.getBoundingClientRect().top;
        positions[key] = Math.round(top * 10) / 10;
        if (top + 0.5 < previous) hierarchy = false;
        previous = top;
      }
      const title = card.querySelector("[data-card-title]");
      const price = card.querySelector("[data-card-price]");
      const provenance = card.querySelector("[data-card-provenance]");
      const credit = card.querySelector("[data-neighborhood-photo-credit]");
      const creditAfterProvenance = !credit || !provenance || Boolean(provenance.compareDocumentPosition(credit) & Node.DOCUMENT_POSITION_FOLLOWING);
      return {
        hierarchy,
        positions,
        height: Math.round(card.getBoundingClientRect().height * 10) / 10,
        titleFont: title ? Number.parseFloat(getComputedStyle(title).fontSize) : 0,
        priceFont: price ? Number.parseFloat(getComputedStyle(price).fontSize) : 0,
        provenanceVisible: provenance ? getComputedStyle(provenance).display !== "none" : false,
        creditAfterProvenance,
      };
    });

    const columns = grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length : 0;
    const firstRect = first?.getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      columns,
      firstListingTop: firstRect ? Math.round(firstRect.top * 10) / 10 : null,
      cardCount: cards.length,
      cards: cardMetrics,
    };
  });

  if (metrics.cardCount < 8) failures.push(`${viewport.name}: expected 8 deterministic cards, got ${metrics.cardCount}`);
  if (metrics.columns !== viewport.columns) failures.push(`${viewport.name}: expected ${viewport.columns} columns, got ${metrics.columns}`);
  if (metrics.horizontalOverflow > 1) failures.push(`${viewport.name}: horizontal overflow ${metrics.horizontalOverflow}px`);
  if (metrics.firstListingTop == null || metrics.firstListingTop > viewport.topMax) failures.push(`${viewport.name}: first listing top ${metrics.firstListingTop}px > ${viewport.topMax}px`);
  for (const [index, card] of metrics.cards.entries()) {
    if (!card.hierarchy) failures.push(`${viewport.name}: card ${index + 1} hierarchy is not IMAGE→PRICE→TITLE→LOCATION→FACTS→PROVENANCE`);
    if (!card.provenanceVisible) failures.push(`${viewport.name}: card ${index + 1} provenance hidden`);
    if (!card.creditAfterProvenance) failures.push(`${viewport.name}: card ${index + 1} neighborhood credit interrupts the scan hierarchy`);
    if (card.height > viewport.cardMax) failures.push(`${viewport.name}: card ${index + 1} height ${card.height}px > ${viewport.cardMax}px`);
    if (card.titleFont < 12) failures.push(`${viewport.name}: card ${index + 1} title font ${card.titleFont}px < 12px`);
    if (viewport.width <= 390 && card.priceFont < 16) failures.push(`${viewport.name}: card ${index + 1} price font ${card.priceFont}px < 16px`);
  }

  const screenshot = path.join(outDir, `${viewport.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  results.push({ ...viewport, ...metrics, screenshot });
  await context.close();
}

await browser.close();

const scoreParts = {
  hierarchy: failures.filter((item) => item.includes("hierarchy")).length === 0 ? 3 : 0,
  provenance: failures.filter((item) => item.includes("provenance") || item.includes("credit")).length === 0 ? 2 : 0,
  readability: failures.filter((item) => item.includes("font")).length === 0 ? 2 : 0,
  density: failures.filter((item) => item.includes("columns") || item.includes("height") || item.includes("first listing") || item.includes("deterministic cards")).length === 0 ? 2 : 0,
  overflow: failures.filter((item) => item.includes("overflow")).length === 0 ? 1 : 0,
};
const score = Object.values(scoreParts).reduce((sum, value) => sum + value, 0);
const report = { variant, baseUrl, fixtureCount: listings.length, score, scoreParts, failures, viewports: results };
await fs.writeFile(path.join(outDir, "metrics.json"), JSON.stringify(report, null, 2));
await fs.writeFile(
  path.join(outDir, "report.md"),
  `# UX-SEARCH-3 Card Architecture — ${variant}\n\nScore contract: **${score.toFixed(1)}/10**\n\n${failures.length ? failures.map((item) => `- FAIL: ${item}`).join("\n") : "- PASS: all hierarchy, provenance, readability, density and overflow assertions passed."}\n`,
);

console.log(JSON.stringify(report, null, 2));
if (failures.length || score < 9) process.exit(1);
