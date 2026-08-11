import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3151";
const variant = process.env.AUDIT_VARIANT ?? "product-design";
const outDir = path.join("data", "audits", "ux-search-controls-10of10-1", variant);
const cases = [
  { name: "mobile-360x800", width: 360, height: 800, desktop: false },
  { name: "mobile-390x844", width: 390, height: 844, desktop: false },
  { name: "tablet-768x900", width: 768, height: 900, desktop: false },
  { name: "desktop-1024x800", width: 1024, height: 800, desktop: true },
  { name: "desktop-1440x900", width: 1440, height: 900, desktop: true },
];

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
const results = [];

const closeTo = (actual, expected, tolerance = 0.75) => Math.abs(actual - expected) <= tolerance;

for (const testCase of cases) {
  const context = await browser.newContext({
    viewport: { width: testCase.width, height: testCase.height },
    colorScheme: "dark",
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const response = await page.goto(`${baseUrl}/search?q=Rabat&view=list`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  if (!response || response.status() >= 400) {
    failures.push(`${testCase.name}: route status ${response?.status() ?? "none"}`);
  }

  await page.waitForSelector('[data-search-global-header="exact-white"]', { timeout: 20_000 });
  await page.waitForSelector("[data-search-controls-section]", { timeout: 20_000 });
  await page.waitForSelector("[data-search-primary-filter-row]", { timeout: 20_000 });
  await page.waitForTimeout(250);

  const metrics = await page.evaluate(({ desktop }) => {
    const header = document.querySelector('[data-search-global-header="exact-white"]');
    const section = document.querySelector("[data-search-controls-section]");
    const controls = document.querySelector("[data-search-quick-filters]");
    const row = document.querySelector("[data-search-primary-filter-row]");
    const search = document.querySelector("#property-search");
    const filter = document.querySelector("[data-search-filter-trigger]");
    const tabs = document.querySelector("[data-search-desktop-transaction-tabs]");
    if (!header || !section || !controls || !row || !search || !filter || !tabs) return null;

    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return { x: value.x, y: value.y, width: value.width, height: value.height, right: value.right, bottom: value.bottom };
    };
    const style = (element) => {
      const value = getComputedStyle(element);
      return {
        backgroundColor: value.backgroundColor,
        color: value.color,
        borderColor: value.borderColor,
        display: value.display,
        borderRadius: value.borderRadius,
      };
    };

    const orangeClassNodes = Array.from(controls.querySelectorAll("*")).filter((element) => {
      const className = typeof element.className === "string" ? element.className : "";
      return /orange|bronze/i.test(className);
    });

    return {
      desktop,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentWidth: document.documentElement.scrollWidth,
      header: { rect: rect(header), style: style(header) },
      section: { rect: rect(section), style: style(section) },
      controlsTheme: controls.getAttribute("data-theme"),
      row: rect(row),
      search: { rect: rect(search), style: style(search), value: search.value },
      filter: { rect: rect(filter), style: style(filter), expanded: filter.getAttribute("aria-expanded") },
      tabs: { rect: rect(tabs), style: style(tabs) },
      orangeClassCount: orangeClassNodes.length,
    };
  }, { desktop: testCase.desktop });

  if (!metrics) {
    failures.push(`${testCase.name}: controls metrics missing`);
  } else {
    const expectedControlHeight = testCase.desktop ? 44 : 48;
    const expectedSectionHeight = testCase.desktop ? 69 : 65;
    const expectedInset = testCase.desktop ? 24 : testCase.width >= 640 ? 24 : 16;
    const expectedTopPadding = testCase.desktop ? 12 : 8;

    if (metrics.documentWidth > metrics.viewport.width + 1) failures.push(`${testCase.name}: horizontal overflow ${metrics.documentWidth} > ${metrics.viewport.width}`);
    if (!closeTo(metrics.header.rect.height, 54)) failures.push(`${testCase.name}: predecessor header height ${metrics.header.rect.height} != 54`);
    if (!closeTo(metrics.section.rect.y, metrics.header.rect.bottom)) failures.push(`${testCase.name}: controls do not start immediately after header`);
    if (!closeTo(metrics.section.rect.height, expectedSectionHeight)) failures.push(`${testCase.name}: controls section height ${metrics.section.rect.height} != ${expectedSectionHeight}`);
    if (metrics.section.style.backgroundColor !== "rgb(255, 255, 255)") failures.push(`${testCase.name}: controls background ${metrics.section.style.backgroundColor} is not pure white`);
    if (metrics.section.style.color !== "rgb(11, 31, 58)") failures.push(`${testCase.name}: controls text base ${metrics.section.style.color} is not canonical AkarFinder foreground`);
    if (metrics.controlsTheme !== "light") failures.push(`${testCase.name}: controls semantic theme ${metrics.controlsTheme} != light`);
    if (!closeTo(metrics.row.y - metrics.section.rect.y, expectedTopPadding)) failures.push(`${testCase.name}: row top padding ${metrics.row.y - metrics.section.rect.y} != ${expectedTopPadding}`);
    if (!closeTo(metrics.row.height, expectedControlHeight)) failures.push(`${testCase.name}: primary row height ${metrics.row.height} != ${expectedControlHeight}`);
    if (!closeTo(metrics.search.rect.height, expectedControlHeight)) failures.push(`${testCase.name}: search height ${metrics.search.rect.height} != ${expectedControlHeight}`);
    if (!closeTo(metrics.filter.rect.height, expectedControlHeight)) failures.push(`${testCase.name}: filter height ${metrics.filter.rect.height} != ${expectedControlHeight}`);
    if (metrics.search.style.backgroundColor !== "rgb(255, 255, 255)") failures.push(`${testCase.name}: search field is not white`);
    if (metrics.filter.style.backgroundColor !== "rgb(255, 255, 255)") failures.push(`${testCase.name}: filter trigger is not white`);
    if (metrics.search.style.color !== "rgb(11, 31, 58)") failures.push(`${testCase.name}: search text is not canonical AkarFinder foreground`);
    if (metrics.filter.style.color !== "rgb(11, 31, 58)") failures.push(`${testCase.name}: filter text is not canonical AkarFinder foreground`);
    if (metrics.search.value !== "Rabat") failures.push(`${testCase.name}: search value ${JSON.stringify(metrics.search.value)} != "Rabat"`);
    if (metrics.orangeClassCount !== 0) failures.push(`${testCase.name}: orange/bronze classes detected inside Search controls`);

    if (testCase.desktop) {
      if (metrics.tabs.style.display === "none") failures.push(`${testCase.name}: desktop transaction selector hidden`);
      if (!closeTo(metrics.tabs.rect.width, 288, 1)) failures.push(`${testCase.name}: desktop transaction width ${metrics.tabs.rect.width} != 288`);
      if (!closeTo(metrics.tabs.rect.height, 44, 1)) failures.push(`${testCase.name}: desktop transaction height ${metrics.tabs.rect.height} != 44`);
      if (metrics.search.rect.width > 521 || metrics.search.rect.width < 359) failures.push(`${testCase.name}: desktop search width ${metrics.search.rect.width} outside 360–520`);
      if (!closeTo(metrics.search.rect.x, expectedInset, 1)) failures.push(`${testCase.name}: desktop search left ${metrics.search.rect.x} != ${expectedInset}`);
    } else {
      if (metrics.tabs.style.display !== "none") failures.push(`${testCase.name}: desktop transaction selector visible below 1024`);
      if (!closeTo(metrics.search.rect.x, expectedInset, 1)) failures.push(`${testCase.name}: mobile/tablet search left ${metrics.search.rect.x} != ${expectedInset}`);
      if (!closeTo(metrics.filter.rect.right, metrics.viewport.width - expectedInset, 1)) failures.push(`${testCase.name}: mobile/tablet filter right ${metrics.filter.rect.right} != ${metrics.viewport.width - expectedInset}`);
      const gap = metrics.filter.rect.x - metrics.search.rect.right;
      if (!closeTo(gap, 8, 1)) failures.push(`${testCase.name}: mobile/tablet search/filter gap ${gap} != 8`);
    }
  }

  if (testCase.desktop) {
    const transactionButton = page.locator('[data-search-desktop-transaction-tabs] button').filter({ hasText: /^Acheter$/ });
    await transactionButton.click();
    const pressed = await transactionButton.getAttribute("aria-pressed");
    const bg = await transactionButton.evaluate((element) => getComputedStyle(element).backgroundColor);
    if (pressed !== "true") failures.push(`${testCase.name}: Acheter transaction did not become pressed`);
    if (bg !== "rgb(11, 99, 206)") failures.push(`${testCase.name}: selected transaction background ${bg} != AkarFinder primary blue`);
  }

  await page.locator("[data-search-filter-trigger]").click();
  if (testCase.desktop || testCase.width >= 640) {
    await page.waitForSelector("[data-search-advanced-filters]", { state: "visible", timeout: 5_000 });
    const advanced = await page.locator("[data-search-advanced-filters]").evaluate((element) => ({
      bg: getComputedStyle(element).backgroundColor,
      fields: element.querySelectorAll("input, select").length,
    }));
    if (advanced.bg !== "rgb(255, 255, 255)") failures.push(`${testCase.name}: advanced panel is not white`);
    if (advanced.fields < 5) failures.push(`${testCase.name}: advanced panel fields ${advanced.fields} < 5`);
    await page.locator("[data-search-filter-trigger]").click();
  } else {
    await page.waitForSelector("[data-search-mobile-filter-sheet]", { state: "visible", timeout: 5_000 });
    const sheet = await page.locator("[data-search-mobile-filter-sheet]").evaluate((element) => ({
      bg: getComputedStyle(element).backgroundColor,
      width: element.getBoundingClientRect().width,
    }));
    if (sheet.bg !== "rgb(255, 255, 255)") failures.push(`${testCase.name}: mobile filter sheet is not white`);
    if (!closeTo(sheet.width, testCase.width, 1)) failures.push(`${testCase.name}: mobile filter sheet width ${sheet.width} != ${testCase.width}`);
    const closeButton = page.getByRole("button", { name: "Fermer", exact: true });
    const closeHeight = await closeButton.evaluate((element) => element.getBoundingClientRect().height);
    if (!closeTo(closeHeight, 48)) failures.push(`${testCase.name}: mobile filter close target ${closeHeight} != 48`);
    await closeButton.click();
  }

  const screenshot = path.join(outDir, `${testCase.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  results.push({ ...testCase, metrics, screenshot });
  await context.close();
}

await browser.close();

const report = {
  lot: "UX-SEARCH-CONTROLS-10OF10-1",
  variant,
  score: failures.length === 0 ? 10 : 0,
  pass: failures.length === 0,
  contract: {
    section: "Search / filters only",
    semanticDesignSystem: true,
    forcedLightSemanticTheme: true,
    pureWhiteSurfaceEvenInDarkScheme: true,
    akarFinderPaletteOnly: true,
    noOrangeOrBronze: true,
    mobileSectionPxIncludingDivider: 65,
    desktopSectionPxIncludingDivider: 69,
    mobilePrimaryRowPx: 48,
    desktopPrimaryRowPx: 44,
    phoneHorizontalInsetPx: 16,
    tabletDesktopHorizontalInsetPx: 24,
    mobileSearchAndFilterSameRow: true,
    desktopTransactionsPreserved: ["Acheter", "Louer", "Neuf"],
    advancedFiltersPreserved: ["Ville", "Budget minimum", "Budget maximum", "Surface minimum", "Type de bien"],
    mobileFilterSheetWhiteAndSafe: true,
    noHorizontalOverflow: true,
    predecessorHeader54PxPreserved: true,
  },
  failures,
  results,
};

await fs.writeFile(path.join(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
