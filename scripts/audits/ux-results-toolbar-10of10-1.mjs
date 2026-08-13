import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3161";
const variant = process.env.AUDIT_VARIANT ?? "product-design";
const outDir = path.join("data", "audits", "ux-results-toolbar-10of10-1", variant);
const cases = [
  { name: "mobile-360x800", width: 360, height: 800 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "tablet-768x900", width: 768, height: 900 },
  { name: "desktop-1024x800", width: 1024, height: 800 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
];

const closeTo = (actual, expected, tolerance = 1.1) => Math.abs(actual - expected) <= tolerance;
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

  await page.waitForSelector("[data-search-results-toolbar]", { timeout: 20_000 });
  await page.waitForSelector("[data-search-sort-select]", { timeout: 20_000 });
  await page.waitForFunction(() => /résultat/.test(document.querySelector("[data-search-results-toolbar] h1")?.textContent ?? ""), null, { timeout: 30_000 });
  if (!phone) await page.waitForSelector("[data-search-desktop-view-switcher]", { state: "visible", timeout: 20_000 });
  await page.waitForTimeout(100);

  const metrics = await page.evaluate(() => {
    const visible = (el) => Boolean(el && getComputedStyle(el).display !== "none" && getComputedStyle(el).visibility !== "hidden" && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0);
    const toolbar = document.querySelector("[data-search-results-toolbar]");
    const heading = toolbar?.querySelector("h1");
    const sort = document.querySelector("[data-search-sort-select]");
    const switcher = document.querySelector("[data-search-desktop-view-switcher]");
    const mobileSelect = document.querySelector("[data-search-mobile-view-select]");
    const layout = document.querySelector("[data-search-view-layout]");
    if (!toolbar || !heading || !sort || !switcher || !layout) return null;
    const rect = (el) => { const r = el.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom }; };
    const buttons = Array.from(switcher.querySelectorAll("[data-search-view-mode-button]"));
    return {
      viewportWidth: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      toolbar: rect(toolbar),
      heading: { ...rect(heading), text: heading.textContent ?? "", color: getComputedStyle(heading).color, clientWidth: heading.clientWidth, scrollWidth: heading.scrollWidth },
      sort: { ...rect(sort), background: getComputedStyle(sort).backgroundColor, color: getComputedStyle(sort).color, radius: getComputedStyle(sort).borderRadius },
      switcherVisible: visible(switcher),
      mobileSelectVisible: visible(mobileSelect),
      buttons: buttons.map((button) => ({ label: button.textContent?.trim() ?? "", pressed: button.getAttribute("aria-pressed"), visible: visible(button) })),
      layoutTop: layout.getBoundingClientRect().top,
    };
  });

  if (!metrics) {
    failures.push(`${testCase.name}: toolbar metrics missing`);
  } else {
    if (metrics.documentWidth > metrics.viewportWidth + 1) failures.push(`${testCase.name}: horizontal overflow`);
    if (!/résultat/.test(metrics.heading.text)) failures.push(`${testCase.name}: result count wording missing`);
    if (metrics.heading.scrollWidth > metrics.heading.clientWidth + 1) failures.push(`${testCase.name}: result count clipped`);
    if (metrics.mobileSelectVisible) failures.push(`${testCase.name}: legacy mobile view select visible`);
    if (metrics.sort.background !== "rgb(255, 255, 255)") failures.push(`${testCase.name}: sort is not white`);
    if (metrics.sort.color !== "rgb(11, 31, 58)") failures.push(`${testCase.name}: sort is not navy`);
    if (metrics.layoutTop - metrics.toolbar.bottom > 12) failures.push(`${testCase.name}: results start too far below toolbar`);

    if (phone) {
      if (metrics.switcherVisible) failures.push(`${testCase.name}: segmented Liste/Mixte/Carte must be hidden on canonical mobile`);
      if (!closeTo(metrics.sort.width, 124, 2)) failures.push(`${testCase.name}: mobile sort width ${metrics.sort.width} != 124`);
      if (!closeTo(metrics.sort.height, 44, 1)) failures.push(`${testCase.name}: mobile sort height ${metrics.sort.height} != 44`);
      if (metrics.toolbar.height > 56) failures.push(`${testCase.name}: mobile toolbar ${metrics.toolbar.height}px is not compact`);
    } else {
      if (!metrics.switcherVisible) failures.push(`${testCase.name}: desktop/tablet view switcher hidden`);
      if (metrics.buttons.map((button) => button.label).join("|") !== "Liste|Mixte|Carte") failures.push(`${testCase.name}: view labels mismatch`);
      if (!metrics.buttons.some((button) => button.pressed === "true")) failures.push(`${testCase.name}: no active view`);
      if (metrics.sort.height < 39.5) failures.push(`${testCase.name}: sort height ${metrics.sort.height} < 40`);
    }
  }

  await page.locator("[data-search-sort-select]").selectOption("price-asc");
  if ((await page.locator("[data-search-sort-select]").inputValue()) !== "price-asc") failures.push(`${testCase.name}: sort interaction failed`);

  if (!phone) {
    for (const [label, view] of [["Liste", "list"], ["Carte", "map"], ["Mixte", "split"]]) {
      const button = page.getByRole("button", { name: label, exact: true });
      await button.click();
      if ((await button.getAttribute("aria-pressed")) !== "true") failures.push(`${testCase.name}: ${label} did not become active`);
      const actual = await page.locator("[data-search-view-layout]").getAttribute("data-search-view-layout");
      if (actual !== view) failures.push(`${testCase.name}: ${label} layout ${actual} != ${view}`);
    }
  }

  const screenshot = path.join(outDir, `${testCase.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  results.push({ ...testCase, phone, metrics, screenshot });
  await context.close();
}

await browser.close();
const report = { lot: "UX-RESULTS-TOOLBAR-10OF10-1", variant, score: failures.length ? 0 : 10, pass: failures.length === 0, contract: { canonicalMobileHidesSegmentedViews: true, mobileSortPx: 44, desktopTabletViewsPreserved: ["Liste", "Mixte", "Carte"], noHorizontalOverflow: true }, failures, results };
await fs.writeFile(path.join(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
