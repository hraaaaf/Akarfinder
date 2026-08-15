import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3195";
const outDir = path.join("data", "audits", "mockup-convergence-l3-favorites");
fs.mkdirSync(outDir, { recursive: true });

const favoriteIds = [
  "casablanca-finance-city-terrasse",
  "casablanca-maarif-studio-renove",
  "rabat-hay-riad-neuf-jardin",
  "rabat-agdal-bureau-location",
  "tanger-malabata-studio-vue-mer",
  "marrakech-route-ourika-villa-piscine",
];

const viewports = [
  { name: "390x844", width: 390, height: 844, expectedColumns: 2 },
  { name: "430x932", width: 430, height: 932, expectedColumns: 2 },
  { name: "768x900", width: 768, height: 900, expectedColumns: 2 },
  { name: "1280x900", width: 1280, height: 900, expectedColumns: 4 },
];

const failures = [];
const results = [];
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    await context.addInitScript(({ key, ids }) => {
      localStorage.setItem(key, JSON.stringify(ids));
    }, { key: "akarfinder:favorites:listings", ids: favoriteIds });

    const page = await context.newPage();
    const response = await page.goto(`${baseUrl}/favorites`, { waitUntil: "networkidle", timeout: 60_000 });
    const local = [];
    if (!response || response.status() >= 400) local.push(`/favorites returned ${response?.status() ?? "no response"}`);

    const cards = page.locator("[data-favorite-card]");
    await cards.first().waitFor({ state: "visible", timeout: 15_000 });
    const cardCount = await cards.count();
    if (cardCount !== favoriteIds.length) local.push(`expected ${favoriteIds.length} populated favorites, got ${cardCount}`);

    const metrics = await page.evaluate(() => {
      const cards = [...document.querySelectorAll("[data-favorite-card]")];
      const xs = [...new Set(cards.map((card) => Math.round(card.getBoundingClientRect().x)))];
      const footer = document.querySelector("[data-favorites-secondary-footer]");
      const footerRect = footer?.getBoundingClientRect();
      const footerStyle = footer ? getComputedStyle(footer) : null;
      const filters = [...document.querySelectorAll('[data-favorites-filters] [role="tab"]')];
      return {
        columns: xs.length,
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        filterCount: filters.length,
        footerVisible: Boolean(
          footer &&
          footerRect &&
          footerRect.width > 0 &&
          footerRect.height > 0 &&
          footerStyle?.display !== "none" &&
          footerStyle?.visibility !== "hidden"
        ),
        firstCardTop: cards[0]?.getBoundingClientRect().top ?? null,
      };
    });

    if (metrics.columns !== viewport.expectedColumns) local.push(`expected ${viewport.expectedColumns} columns, got ${metrics.columns}`);
    if (metrics.overflowX > 1) local.push(`horizontal overflow ${metrics.overflowX}px`);
    if (metrics.filterCount !== 4) local.push(`expected 4 real transaction filters, got ${metrics.filterCount}`);
    if (viewport.width < 640 && metrics.footerVisible) local.push("secondary footer must not compete with mobile favorites viewport");
    if (metrics.firstCardTop != null && metrics.firstCardTop > 390) local.push(`first favorite card starts too low: ${metrics.firstCardTop}px`);

    await page.screenshot({ path: path.join(outDir, `${viewport.name}.png`), fullPage: true });
    results.push({ viewport, cardCount, metrics, failures: local });
    for (const failure of local) failures.push(`${viewport.name}: ${failure}`);
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(({ key, ids }) => localStorage.setItem(key, JSON.stringify(ids)), {
    key: "akarfinder:favorites:listings",
    ids: favoriteIds,
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/favorites`, { waitUntil: "networkidle", timeout: 60_000 });
  const rentTab = page.getByRole("tab", { name: /À louer/ });
  await rentTab.click();
  const rentCards = page.locator('[data-favorite-card][data-transaction-type="rent"]');
  const visibleCards = page.locator("[data-favorite-card]");
  if ((await visibleCards.count()) !== 1 || (await rentCards.count()) !== 1) {
    failures.push("transaction segmentation does not produce the expected real rent subset");
  }
  await page.screenshot({ path: path.join(outDir, "390x844-rent-filter.png"), fullPage: true });
  await context.close();
} finally {
  await browser.close();
}

const report = {
  lot: "Mockup Convergence L3 Favorites",
  generatedAt: new Date().toISOString(),
  favoriteIds,
  failures,
  results,
};
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exit(1);
