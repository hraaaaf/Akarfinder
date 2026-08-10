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

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const failures = [];

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/search?city=Rabat&view=list`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForSelector("[data-search-continuous-flow], [data-search-external-mobile-grid]", { timeout: 30_000 });
  await page.waitForTimeout(1200);

  const metrics = await page.evaluate(() => {
    const cardSelector = "[data-mobile-compact-card], [data-mobile-compact-external-card]";
    const cards = Array.from(document.querySelectorAll(cardSelector)).slice(0, 8);
    const grid = document.querySelector("[data-search-continuous-flow] > div.grid") ?? document.querySelector("[data-search-external-mobile-grid]");
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
      return {
        hierarchy,
        positions,
        height: Math.round(card.getBoundingClientRect().height * 10) / 10,
        titleFont: title ? Number.parseFloat(getComputedStyle(title).fontSize) : 0,
        priceFont: price ? Number.parseFloat(getComputedStyle(price).fontSize) : 0,
        provenanceVisible: provenance ? getComputedStyle(provenance).display !== "none" : false,
        creditAfterProvenance: !credit || !provenance || provenance.compareDocumentPosition(credit) & Node.DOCUMENT_POSITION_FOLLOWING ? true : false,
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

  if (metrics.cardCount < 2) failures.push(`${viewport.name}: fewer than 2 cards rendered`);
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
  density: failures.filter((item) => item.includes("columns") || item.includes("height") || item.includes("first listing")).length === 0 ? 2 : 0,
  overflow: failures.filter((item) => item.includes("overflow")).length === 0 ? 1 : 0,
};
const score = Object.values(scoreParts).reduce((sum, value) => sum + value, 0);
const report = { variant, baseUrl, score, scoreParts, failures, viewports: results };
await fs.writeFile(path.join(outDir, "metrics.json"), JSON.stringify(report, null, 2));
await fs.writeFile(
  path.join(outDir, "report.md"),
  `# UX-SEARCH-3 Card Architecture — ${variant}\n\nScore contract: **${score.toFixed(1)}/10**\n\n${failures.length ? failures.map((item) => `- FAIL: ${item}`).join("\n") : "- PASS: all hierarchy, provenance, readability, density and overflow assertions passed."}\n`,
);

console.log(JSON.stringify(report, null, 2));
if (failures.length || score < 9) process.exit(1);
