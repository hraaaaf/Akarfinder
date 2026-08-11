import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3125";
const variant = process.env.AUDIT_VARIANT ?? "product-design";
const outDir = process.env.AUDIT_DIR ?? path.join("data", "audits", "ux-search-mobile-precision-6", variant);
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800, columns: 2, topMax: 205, cardMax: 345 },
  { name: "mobile-390x844", width: 390, height: 844, columns: 2, topMax: 205, cardMax: 350 },
  { name: "tablet-768x900", width: 768, height: 900, columns: 2, topMax: 220, cardMax: 430 },
  { name: "desktop-1024x800", width: 1024, height: 800, columns: 3, topMax: 220, cardMax: 430 },
  { name: "desktop-1280x900", width: 1280, height: 900, columns: 4, topMax: 220, cardMax: 430 },
  { name: "desktop-1440x900", width: 1440, height: 900, columns: 4, topMax: 220, cardMax: 430 },
];

const cities = ["Rabat", "Casablanca", "Marrakech", "Tanger", "Agadir", "Fès", "Rabat", "Casablanca"];
const listings = cities.map((city, index) => ({
  id: `ux-search-6-${index + 1}`,
  title: index % 2 === 0
    ? `Appartement lumineux avec terrasse et vue dégagée dans un quartier recherché de ${city}`
    : `Villa familiale moderne proche des écoles, commerces et principaux axes de ${city}`,
  city,
  neighborhood: city === "Rabat" ? "Agdal" : "Quartier central",
  price: 1450000 + index * 185000,
  currency: "DH",
  surface_m2: 78 + index * 11,
  price_per_m2: 17600,
  property_type: index % 2 === 0 ? "Appartement" : "Villa",
  transaction_type: "buy",
  bedrooms: 3,
  bathrooms: 2,
  freshness_label: "Récent",
  source_type: "Source analysée",
  reliability_label: "Informations complètes",
  reliability_score: 91,
  reliability_available: true,
  is_mre_friendly: false,
  description: "Fixture déterministe UX-SEARCH-6.",
  image_url: "",
  reliability_explanation: "Fixture CI",
  data_completeness_score: 92,
  source_name: "AkarFinder",
  duplicate_score: 0.1,
  listing_url: `https://fixture.example/${city.toLowerCase()}/${index}`,
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
const failures = [];
const results = [];

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  await page.route("https://commons.wikimedia.org/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="960" height="540" fill="#7891a2"/><path d="M0 370L240 170l160 150 180-120 380 340H0z" fill="#d7c39f"/></svg>',
    });
  });
  await page.route("**/api/search?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ listings, total: listings.length, limit: 100, offset: 0, source: "ux-search-6-ci", generated_at: new Date().toISOString() }),
    });
  });
  await page.route("**/api/search/gateway?**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: [], total_count: 0, next_cursor: null, has_more: false }) });
  });

  const response = await page.goto(`${baseUrl}/search?view=list`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!response || response.status() >= 400) failures.push(`${viewport.name}: search returned ${response?.status() ?? "no response"}`);
  await page.waitForFunction(() => document.querySelectorAll("article[data-mobile-compact-card]").length >= 8, null, { timeout: 30_000 });
  await page.waitForTimeout(450);

  const metrics = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll("article[data-mobile-compact-card]")).slice(0, 8);
    const grid = document.querySelector("[data-search-continuous-flow] > div.grid");
    const first = cards[0];
    const heights = cards.map((card) => card.getBoundingClientRect().height);
    const controlSelectors = [
      "[data-search-primary-search] input",
      "[data-search-filter-trigger]",
      "[data-search-mobile-view-select]",
      "[data-search-sort-select]",
    ];
    const controls = controlSelectors.map((selector) => {
      const node = document.querySelector(selector);
      return node ? { selector, height: node.getBoundingClientRect().height } : null;
    }).filter(Boolean);
    const factOverflows = cards.filter((card) => {
      const node = card.querySelector("[data-card-facts]");
      return node && node.scrollWidth - node.clientWidth > 1;
    }).length;
    const priceOverflows = cards.filter((card) => {
      const node = card.querySelector("[data-card-price]");
      return node && node.scrollWidth - node.clientWidth > 1;
    }).length;
    const locationOverflows = cards.filter((card) => {
      const node = card.querySelector("[data-card-location]");
      return node && node.getBoundingClientRect().right > card.getBoundingClientRect().right + 1;
    }).length;
    return {
      cardCount: cards.length,
      columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
      rowGap: grid ? parseFloat(getComputedStyle(grid).rowGap) : null,
      columnGap: grid ? parseFloat(getComputedStyle(grid).columnGap) : null,
      firstTop: first ? first.getBoundingClientRect().top : null,
      maxCardHeight: Math.max(...heights),
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      controls,
      factOverflows,
      priceOverflows,
      locationOverflows,
      brokenImages: cards.flatMap((card) => Array.from(card.querySelectorAll("[data-card-image] img"))).filter((img) => !(img.complete && img.naturalWidth > 0)).length,
    };
  });

  if (metrics.cardCount !== 8) failures.push(`${viewport.name}: expected 8 cards, got ${metrics.cardCount}`);
  if (metrics.columns !== viewport.columns) failures.push(`${viewport.name}: expected ${viewport.columns} columns, got ${metrics.columns}`);
  if (metrics.firstTop == null || metrics.firstTop > viewport.topMax) failures.push(`${viewport.name}: first card top ${metrics.firstTop}px > ${viewport.topMax}px`);
  if (metrics.maxCardHeight > viewport.cardMax) failures.push(`${viewport.name}: max card ${metrics.maxCardHeight}px > ${viewport.cardMax}px`);
  if (metrics.overflow > 1) failures.push(`${viewport.name}: horizontal overflow ${metrics.overflow}px`);
  if (metrics.brokenImages !== 0) failures.push(`${viewport.name}: broken images ${metrics.brokenImages}`);
  if (metrics.factOverflows !== 0) failures.push(`${viewport.name}: facts overflow in ${metrics.factOverflows} cards`);
  if (metrics.priceOverflows !== 0) failures.push(`${viewport.name}: price overflow in ${metrics.priceOverflows} cards`);
  if (metrics.locationOverflows !== 0) failures.push(`${viewport.name}: location overflow in ${metrics.locationOverflows} cards`);
  if (viewport.width < 640) {
    for (const control of metrics.controls) {
      if (control.height < 47.5) failures.push(`${viewport.name}: ${control.selector} touch target ${control.height}px < 48px`);
    }
    if (metrics.rowGap == null || metrics.rowGap > 16) failures.push(`${viewport.name}: row gap ${metrics.rowGap}px > 16px`);
  }

  const screenshot = path.join(outDir, `${viewport.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  results.push({ ...viewport, ...metrics, screenshot });
  await context.close();
}

await browser.close();

const scoreParts = {
  mobileRhythm: failures.filter((x) => x.includes("row gap") || x.includes("first card") || x.includes("max card")).length === 0 ? 2.5 : 0,
  touchErgonomics: failures.filter((x) => x.includes("touch target")).length === 0 ? 2 : 0,
  microClipping: failures.filter((x) => x.includes("facts overflow") || x.includes("price overflow") || x.includes("location overflow")).length === 0 ? 2 : 0,
  responsiveContinuity: failures.filter((x) => x.includes("columns") || x.includes("horizontal overflow")).length === 0 ? 2 : 0,
  visualIntegrity: failures.filter((x) => x.includes("broken images")).length === 0 ? 1.5 : 0,
};
const score = Object.values(scoreParts).reduce((sum, value) => sum + value, 0);
const report = { variant, baseUrl, score, scoreParts, failures, viewports: results };
await fs.writeFile(path.join(outDir, "metrics.json"), JSON.stringify(report, null, 2));
await fs.writeFile(path.join(outDir, "report.md"), `# UX-SEARCH-6 Mobile Precision — ${variant}\n\nScore contract: **${score.toFixed(1)}/10**\n\n${failures.length ? failures.map((item) => `- FAIL: ${item}`).join("\n") : "- PASS: mobile rhythm, 48px controls, clipping, responsive continuity and visual integrity all pass."}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length || score < 9) process.exit(1);
