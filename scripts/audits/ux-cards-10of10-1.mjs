import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3163";
const variant = process.env.AUDIT_VARIANT ?? "local";
const outDir = path.join("data", "audits", "ux-cards-10of10-1", variant);
fs.mkdirSync(outDir, { recursive: true });

const viewports = [
  { width: 360, height: 800, expectedColumns: 2, expectedImageHeight: 164 },
  { width: 390, height: 844, expectedColumns: 2, expectedImageHeight: 164 },
  { width: 768, height: 900, expectedColumns: 2, expectedImageHeight: 196 },
  { width: 1024, height: 900, expectedColumns: 3, expectedImageHeight: 196 },
  { width: 1280, height: 900, expectedColumns: 4, expectedImageHeight: 196 },
  { width: 1440, height: 1000, expectedColumns: 4, expectedImageHeight: 196 },
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

// Same deterministic, read-only Playwright fixture strategy as the frozen UX-SEARCH-3 card gate.
// No database writes are needed for visual certification.
const listings = Array.from({ length: 8 }, (_, index) => ({
  id: `ux-cards-10of10-1-${index + 1}`,
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
  description: "Fixture déterministe de certification UX-CARDS-10OF10-1.",
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

function rgb(value) {
  const match = String(value).match(/rgba?\((\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/i);
  if (!match) return null;
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
}

function isLight(value) {
  const c = rgb(value);
  return Boolean(c && c.r >= 235 && c.g >= 235 && c.b >= 235);
}

function isBlue(value) {
  const c = rgb(value);
  return Boolean(c && c.b >= c.r + 45 && c.b >= c.g + 30 && c.g >= c.r + 20);
}

function isBronze(value) {
  const c = rgb(value);
  if (!c) return false;
  return c.r > c.b + 35 && c.g > c.b + 5 && c.r > c.g;
}

function closeTo(actual, expected, tolerance = 3) {
  return Math.abs(actual - expected) <= tolerance;
}

const browser = await chromium.launch({ headless: true });
const results = [];
const failures = [];

try {
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
          source: "ux-cards-10of10-1-ci-fixture",
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
    if (!response || response.status() >= 400) {
      failures.push(`${viewport.width}px: search route returned ${response?.status() ?? "no response"}`);
    }

    await page.waitForFunction(() => document.querySelectorAll("[data-search-listing-card]").length >= 8, null, { timeout: 30_000 });
    await page.waitForTimeout(350);

    const listButton = page.locator('[data-search-view-mode-button="list"]');
    await listButton.waitFor({ state: "visible", timeout: 10_000 });
    if ((await listButton.getAttribute("aria-pressed")) !== "true") {
      await listButton.click();
      await page.waitForTimeout(250);
    }

    const cards = page.locator("[data-search-listing-card]");
    const visibleCards = await cards.evaluateAll((nodes) => nodes.filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    }).length);

    const metrics = await page.evaluate(() => {
      const allCards = [...document.querySelectorAll("[data-search-listing-card]")].filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      const first = allCards[0];
      if (!first) return null;

      const firstRect = first.getBoundingClientRect();
      const firstTop = firstRect.top;
      const firstRow = allCards.filter((card) => Math.abs(card.getBoundingClientRect().top - firstTop) <= 3);
      const image = first.querySelector("[data-card-image]");
      const price = first.querySelector("[data-card-price]");
      const title = first.querySelector("[data-card-title]");
      const location = first.querySelector("[data-card-location]");
      const facts = first.querySelector("[data-card-facts]");
      const fact = facts?.querySelector("span");
      const favorite = first.querySelector("[data-card-favorite] button") ?? document.querySelector("[data-card-favorite] button");
      const action = first.querySelector("[data-card-primary-action]") ?? document.querySelector("[data-card-primary-action]");
      const cardStyle = getComputedStyle(first);
      const priceStyle = price ? getComputedStyle(price) : null;
      const titleStyle = title ? getComputedStyle(title) : null;
      const locationStyle = location ? getComputedStyle(location) : null;
      const factStyle = fact ? getComputedStyle(fact) : null;
      const actionStyle = action ? getComputedStyle(action) : null;
      const imageRect = image?.getBoundingClientRect();
      const titleRect = title?.getBoundingClientRect();
      const locationRect = location?.getBoundingClientRect();
      const favoriteRect = favorite?.getBoundingClientRect();
      const actionRect = action?.getBoundingClientRect();
      const grid = first.parentElement;
      const gridStyle = grid ? getComputedStyle(grid) : null;

      return {
        card: {
          top: firstRect.top,
          width: firstRect.width,
          height: firstRect.height,
          background: cardStyle.backgroundColor,
          border: cardStyle.borderTopColor,
          radius: parseFloat(cardStyle.borderTopLeftRadius),
          shadow: cardStyle.boxShadow,
        },
        columns: firstRow.length,
        gridTemplateColumns: gridStyle?.gridTemplateColumns ?? "",
        imageHeight: imageRect?.height ?? 0,
        priceColor: priceStyle?.color ?? "",
        titleColor: titleStyle?.color ?? "",
        titleHeight: titleRect?.height ?? 0,
        titleLineHeight: titleStyle ? parseFloat(titleStyle.lineHeight) : 0,
        locationHeight: locationRect?.height ?? 0,
        locationLineHeight: locationStyle ? parseFloat(locationStyle.lineHeight) : 0,
        factRadius: factStyle ? parseFloat(factStyle.borderTopLeftRadius) : null,
        factBackground: factStyle?.backgroundColor ?? "",
        favorite: favoriteRect ? { width: favoriteRect.width, height: favoriteRect.height } : null,
        action: actionRect && actionStyle && actionRect.width > 0 && actionRect.height > 0 ? {
          width: actionRect.width,
          height: actionRect.height,
          background: actionStyle.backgroundColor,
          color: actionStyle.color,
          border: actionStyle.borderTopColor,
        } : null,
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    const localFailures = [];
    if (!metrics) {
      localFailures.push("no visible listing card metrics");
    } else {
      if (visibleCards !== listings.length) localFailures.push(`expected ${listings.length} deterministic cards, got ${visibleCards}`);
      if (metrics.columns !== viewport.expectedColumns) localFailures.push(`expected ${viewport.expectedColumns} first-row cards, got ${metrics.columns}`);
      if (!closeTo(metrics.imageHeight, viewport.expectedImageHeight, 4)) localFailures.push(`image height ${metrics.imageHeight}px != ${viewport.expectedImageHeight}px`);
      if (!isLight(metrics.card.background)) localFailures.push(`card background is not light: ${metrics.card.background}`);
      if (isBronze(metrics.card.border)) localFailures.push(`legacy bronze card border detected: ${metrics.card.border}`);
      if (!isBlue(metrics.priceColor)) localFailures.push(`price is not blue-led: ${metrics.priceColor}`);
      if (metrics.titleLineHeight > 0 && metrics.titleHeight > metrics.titleLineHeight * 2.25) localFailures.push(`title exceeds two lines: ${metrics.titleHeight}/${metrics.titleLineHeight}`);
      if (metrics.locationLineHeight > 0 && metrics.locationHeight > metrics.locationLineHeight * 1.55) localFailures.push(`location exceeds one line: ${metrics.locationHeight}/${metrics.locationLineHeight}`);
      if (metrics.factRadius != null && metrics.factRadius > 9) localFailures.push(`fact treatment is too pill-like: radius ${metrics.factRadius}px`);
      if (!metrics.favorite) localFailures.push("favorite control is missing from first-party card fixture");
      if (metrics.favorite && (metrics.favorite.width < 43.5 || metrics.favorite.height < 43.5)) localFailures.push(`favorite touch target below 44px: ${metrics.favorite.width}x${metrics.favorite.height}`);
      if (viewport.width >= 640) {
        if (!metrics.action) localFailures.push("desktop primary action is missing");
        if (metrics.action && metrics.action.height < 43.5) localFailures.push(`primary action below 44px: ${metrics.action.height}px`);
        if (metrics.action && !isBlue(metrics.action.color)) localFailures.push(`primary action text is not blue-led: ${metrics.action.color}`);
        if (metrics.action && !isLight(metrics.action.background)) localFailures.push(`primary action background is not light: ${metrics.action.background}`);
      }
      if (metrics.overflowX > 1) localFailures.push(`horizontal overflow ${metrics.overflowX}px`);
      if (viewport.width <= 390 && metrics.card.top > 255) localFailures.push(`first mobile card starts too low at ${metrics.card.top}px`);
      if (viewport.width <= 390 && (metrics.card.width < 145 || metrics.card.width > 190)) localFailures.push(`mobile two-column card width out of range: ${metrics.card.width}px`);
      if (viewport.width >= 1280 && metrics.card.width < 245) localFailures.push(`wide desktop card is too narrow: ${metrics.card.width}px`);
    }

    await page.screenshot({
      path: path.join(outDir, `cards-${viewport.width}x${viewport.height}.png`),
      fullPage: false,
    });

    const record = { viewport, visibleCards, metrics, failures: localFailures };
    results.push(record);
    for (const failure of localFailures) failures.push(`${viewport.width}px: ${failure}`);
    await context.close();
  }
} finally {
  await browser.close();
}

const report = {
  lot: "UX-CARDS-10OF10-1",
  variant,
  baseUrl,
  fixtureCount: listings.length,
  generatedAt: new Date().toISOString(),
  score: failures.length === 0 ? 10 : Math.max(0, Number((10 - failures.length * 0.5).toFixed(1))),
  failures,
  results,
};

fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(
  path.join(outDir, "summary.txt"),
  failures.length === 0
    ? `UX-CARDS-10OF10-1 ${variant}: PASS 10/10\n`
    : `UX-CARDS-10OF10-1 ${variant}: FAIL\n${failures.join("\n")}\n`,
);

console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) {
  console.error(`UX-CARDS-10OF10-1 visual certification failed with ${failures.length} finding(s).`);
  process.exit(1);
}
console.log("UX-CARDS-10OF10-1 visual certification passed at 10/10.");
