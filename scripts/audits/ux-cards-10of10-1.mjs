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

function rgb(value) {
  const match = String(value).match(/rgba?\((\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/i);
  if (!match) return null;
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
}

function isLight(value) {
  const c = rgb(value);
  return Boolean(c && c.r >= 245 && c.g >= 245 && c.b >= 245);
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
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();

    await page.goto(`${baseUrl}/search`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(900);

    const listButton = page.locator('[data-search-view-mode-button="list"]');
    await listButton.waitFor({ state: "visible", timeout: 10_000 });
    await listButton.click();
    await page.waitForTimeout(250);

    const cards = page.locator("[data-search-listing-card]");
    await cards.first().waitFor({ state: "visible", timeout: 12_000 });
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
      if (visibleCards < viewport.expectedColumns) localFailures.push(`only ${visibleCards} visible cards for ${viewport.expectedColumns}-column contract`);
      if (metrics.columns !== viewport.expectedColumns) localFailures.push(`expected ${viewport.expectedColumns} first-row cards, got ${metrics.columns}`);
      if (!closeTo(metrics.imageHeight, viewport.expectedImageHeight, 4)) localFailures.push(`image height ${metrics.imageHeight}px != ${viewport.expectedImageHeight}px`);
      if (!isLight(metrics.card.background)) localFailures.push(`card background is not light: ${metrics.card.background}`);
      if (isBronze(metrics.card.border)) localFailures.push(`legacy bronze card border detected: ${metrics.card.border}`);
      if (!isBlue(metrics.priceColor)) localFailures.push(`price is not blue-led: ${metrics.priceColor}`);
      if (metrics.titleLineHeight > 0 && metrics.titleHeight > metrics.titleLineHeight * 2.25) localFailures.push(`title exceeds two lines: ${metrics.titleHeight}/${metrics.titleLineHeight}`);
      if (metrics.locationLineHeight > 0 && metrics.locationHeight > metrics.locationLineHeight * 1.55) localFailures.push(`location exceeds one line: ${metrics.locationHeight}/${metrics.locationLineHeight}`);
      if (metrics.factRadius != null && metrics.factRadius > 9) localFailures.push(`fact treatment is too pill-like: radius ${metrics.factRadius}px`);
      if (metrics.favorite && (metrics.favorite.width < 43.5 || metrics.favorite.height < 43.5)) localFailures.push(`favorite touch target below 44px: ${metrics.favorite.width}x${metrics.favorite.height}`);
      if (viewport.width >= 640 && metrics.action) {
        if (metrics.action.height < 43.5) localFailures.push(`primary action below 44px: ${metrics.action.height}px`);
        if (!isBlue(metrics.action.color)) localFailures.push(`primary action text is not blue-led: ${metrics.action.color}`);
        if (!isLight(metrics.action.background)) localFailures.push(`primary action background is not light: ${metrics.action.background}`);
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
