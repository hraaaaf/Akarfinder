import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3151";
const variant = process.env.AUDIT_VARIANT ?? "product-design";
const outDir = path.join("data", "audits", "ux-search-controls-10of10-1", variant);
const cases = [
  { name: "mobile-360x800", width: 360, height: 800 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "tablet-768x900", width: 768, height: 900 },
  { name: "desktop-1024x800", width: 1024, height: 800 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
];

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
const results = [];

for (const testCase of cases) {
  const phone = testCase.width < 640;
  const context = await browser.newContext({ viewport: { width: testCase.width, height: testCase.height }, colorScheme: "dark", deviceScaleFactor: 1 });
  const page = await context.newPage();
  const response = await page.goto(`${baseUrl}/search?q=Rabat&view=list`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!response || response.status() >= 400) failures.push(`${testCase.name}: route status ${response?.status() ?? "none"}`);

  await page.waitForSelector("[data-search-controls-section]", { timeout: 20_000 });
  await page.waitForSelector("[data-premium-quickfilters-row]", { timeout: 20_000 });
  await page.waitForSelector("#property-search", { timeout: 20_000 });
  await page.waitForTimeout(150);

  const metrics = await page.evaluate(() => {
    const visible = (el) => Boolean(el && getComputedStyle(el).display !== "none" && getComputedStyle(el).visibility !== "hidden" && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0);
    const section = document.querySelector("[data-search-controls-section]");
    const controls = document.querySelector("[data-search-quick-filters]");
    const search = document.querySelector("#property-search");
    const filter = document.querySelector("[data-search-filter-trigger]");
    const chips = Array.from(document.querySelectorAll("[data-premium-quickfilters-row] [data-quickfilter]"));
    if (!section || !controls || !search || !filter || chips.length !== 5) return null;
    const rect = (el) => { const r = el.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom }; };
    return {
      viewportWidth: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      section: rect(section),
      theme: controls.getAttribute("data-theme"),
      search: { ...rect(search), value: search.value, bg: getComputedStyle(search).backgroundColor, color: getComputedStyle(search).color },
      filter: { ...rect(filter), bg: getComputedStyle(filter).backgroundColor, color: getComputedStyle(filter).color },
      chips: chips.map((chip) => ({ key: chip.getAttribute("data-quickfilter"), text: chip.textContent?.trim() ?? "", pressed: chip.getAttribute("aria-pressed"), visible: visible(chip), height: chip.getBoundingClientRect().height })),
    };
  });

  if (!metrics) {
    failures.push(`${testCase.name}: premium controls metrics missing`);
  } else {
    if (metrics.documentWidth > metrics.viewportWidth + 1) failures.push(`${testCase.name}: horizontal overflow`);
    if (metrics.theme !== "light") failures.push(`${testCase.name}: controls theme is not light`);
    if (metrics.search.value !== "Rabat") failures.push(`${testCase.name}: search value ${JSON.stringify(metrics.search.value)} != Rabat`);
    if (metrics.search.bg !== "rgb(255, 255, 255)" || metrics.filter.bg !== "rgb(255, 255, 255)") failures.push(`${testCase.name}: search/filter surface is not white`);
    if (metrics.search.height < 47.5 || metrics.filter.height < 47.5) failures.push(`${testCase.name}: search/filter target below 48px`);
    const keys = metrics.chips.map((chip) => chip.key).join("|");
    if (keys !== "all|buy|rent|price|filters") failures.push(`${testCase.name}: quick filter order ${keys} is not canonical`);
    if (metrics.chips.some((chip) => !chip.visible)) failures.push(`${testCase.name}: one or more canonical quick filters hidden`);
    if (metrics.chips.some((chip) => chip.height < 39.5)) failures.push(`${testCase.name}: quick filter target below 40px`);
    if (phone && metrics.search.x < 15) failures.push(`${testCase.name}: mobile search inset too small`);
  }

  const buy = page.locator('[data-quickfilter="buy"]');
  await buy.click();
  if ((await buy.getAttribute("aria-pressed")) !== "true") failures.push(`${testCase.name}: À vendre quick filter did not become active`);
  const rent = page.locator('[data-quickfilter="rent"]');
  await rent.click();
  if ((await rent.getAttribute("aria-pressed")) !== "true") failures.push(`${testCase.name}: À louer quick filter did not become active`);
  const all = page.locator('[data-quickfilter="all"]');
  await all.click();
  if ((await all.getAttribute("aria-pressed")) !== "true") failures.push(`${testCase.name}: Tous quick filter did not reset transaction`);

  await page.locator("[data-search-filter-trigger]").click();
  if (phone) {
    await page.waitForSelector("[data-search-mobile-filter-sheet]", { state: "visible", timeout: 5_000 });
    const sheet = page.locator("[data-search-mobile-filter-sheet]");
    const sheetMetrics = await sheet.evaluate((el) => ({ width: el.getBoundingClientRect().width, bg: getComputedStyle(el).backgroundColor, fields: el.querySelectorAll("input, select").length }));
    if (Math.abs(sheetMetrics.width - testCase.width) > 1) failures.push(`${testCase.name}: mobile filter sheet is not full width`);
    if (sheetMetrics.bg !== "rgb(255, 255, 255)") failures.push(`${testCase.name}: mobile filter sheet is not white`);
    if (sheetMetrics.fields < 5) failures.push(`${testCase.name}: mobile filter sheet missing advanced fields`);
    await page.getByRole("button", { name: "Fermer", exact: true }).click();
  } else {
    await page.waitForSelector("[data-search-advanced-filters]", { state: "visible", timeout: 5_000 });
    const fields = await page.locator("[data-search-advanced-filters]").locator("input, select").count();
    if (fields < 5) failures.push(`${testCase.name}: advanced filters missing fields`);
    await page.locator("[data-search-filter-trigger]").click();
  }

  const screenshot = path.join(outDir, `${testCase.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  results.push({ ...testCase, phone, metrics, screenshot });
  await context.close();
}

await browser.close();
const report = { lot: "UX-SEARCH-CONTROLS-10OF10-1", variant, score: failures.length ? 0 : 10, pass: failures.length === 0, contract: { canonicalQuickFilters: ["Tous", "À vendre", "À louer", "Prix", "Filtres"], searchAndFilterTouchSafe: true, mobileFilterSheetPreserved: true, advancedFiltersPreserved: true, noHorizontalOverflow: true }, failures, results };
await fs.writeFile(path.join(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
