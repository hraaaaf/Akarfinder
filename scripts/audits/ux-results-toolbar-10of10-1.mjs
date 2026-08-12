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

const closeTo = (actual, expected, tolerance = 0.8) => Math.abs(actual - expected) <= tolerance;
const rgb = {
  white: "rgb(255, 255, 255)",
  navy: "rgb(11, 31, 58)",
  blue: "rgb(11, 99, 206)",
  border: "rgb(221, 231, 242)",
};

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
const results = [];

for (const testCase of cases) {
  const phone = testCase.width < 640;
  const desktop = testCase.width >= 1024;
  const context = await browser.newContext({
    viewport: { width: testCase.width, height: testCase.height },
    colorScheme: "dark",
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const response = await page.goto(`${baseUrl}/search?q=Rabat`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  if (!response || response.status() >= 400) {
    failures.push(`${testCase.name}: route status ${response?.status() ?? "none"}`);
  }

  await page.waitForSelector('[data-search-global-header="exact-white"]', { timeout: 20_000 });
  await page.waitForSelector("[data-search-controls-section]", { timeout: 20_000 });
  await page.waitForSelector("[data-search-results-toolbar]", { timeout: 20_000 });
  await page.waitForSelector("[data-search-desktop-view-switcher]", { state: "visible", timeout: 20_000 });
  await page.waitForTimeout(250);

  const metrics = await page.evaluate(() => {
    const header = document.querySelector('[data-search-global-header="exact-white"]');
    const controls = document.querySelector("[data-search-controls-section]");
    const toolbar = document.querySelector("[data-search-results-toolbar]");
    const viewRoot = document.querySelector("[data-results-toolbar-view-control]");
    const switcher = document.querySelector("[data-search-desktop-view-switcher]");
    const mobileSelect = document.querySelector("[data-search-mobile-view-select]");
    const sort = document.querySelector("[data-search-sort-select]");
    const layout = document.querySelector("[data-search-view-layout]");
    if (!header || !controls || !toolbar || !viewRoot || !switcher || !mobileSelect || !sort || !layout) return null;

    const countGroup = toolbar.firstElementChild;
    const actions = toolbar.lastElementChild;
    const heading = countGroup?.querySelector("h1");
    const buttons = Array.from(switcher.querySelectorAll("button"));
    if (!countGroup || !actions || !heading || buttons.length !== 3) return null;

    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return {
        x: value.x,
        y: value.y,
        width: value.width,
        height: value.height,
        right: value.right,
        bottom: value.bottom,
      };
    };
    const style = (element) => {
      const value = getComputedStyle(element);
      return {
        display: value.display,
        backgroundColor: value.backgroundColor,
        color: value.color,
        borderColor: value.borderBottomColor,
        borderRadius: value.borderRadius,
      };
    };

    const selected = buttons.find((button) => button.getAttribute("aria-pressed") === "true");
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentWidth: document.documentElement.scrollWidth,
      header: { rect: rect(header), style: style(header) },
      controls: { rect: rect(controls), style: style(controls) },
      toolbar: { rect: rect(toolbar), style: style(toolbar) },
      countGroup: rect(countGroup),
      heading: {
        rect: rect(heading),
        style: style(heading),
        text: heading.textContent ?? "",
        clientWidth: heading.clientWidth,
        scrollWidth: heading.scrollWidth,
      },
      actions: { rect: rect(actions), style: style(actions) },
      viewRoot: rect(viewRoot),
      switcher: { rect: rect(switcher), style: style(switcher) },
      mobileSelectDisplay: getComputedStyle(mobileSelect).display,
      sort: { rect: rect(sort), style: style(sort), value: sort.value },
      buttons: buttons.map((button) => ({
        label: button.textContent?.trim() ?? "",
        pressed: button.getAttribute("aria-pressed"),
        rect: rect(button),
        style: style(button),
      })),
      selected: selected ? { label: selected.textContent?.trim() ?? "", style: style(selected) } : null,
      layout: { rect: rect(layout), view: layout.getAttribute("data-search-view-layout") },
    };
  });

  if (!metrics) {
    failures.push(`${testCase.name}: toolbar metrics missing`);
  } else {
    if (metrics.documentWidth > metrics.viewport.width + 1) failures.push(`${testCase.name}: horizontal overflow ${metrics.documentWidth} > ${metrics.viewport.width}`);
    if (!closeTo(metrics.header.rect.height, 54)) failures.push(`${testCase.name}: frozen Header height ${metrics.header.rect.height} != 54`);
    const expectedControlsHeight = desktop ? 69 : 65;
    if (!closeTo(metrics.controls.rect.height, expectedControlsHeight)) failures.push(`${testCase.name}: frozen Search controls height ${metrics.controls.rect.height} != ${expectedControlsHeight}`);
    if (metrics.controls.style.backgroundColor !== rgb.white) failures.push(`${testCase.name}: frozen Search controls are no longer white`);

    if (metrics.toolbar.style.backgroundColor !== rgb.white) failures.push(`${testCase.name}: toolbar background ${metrics.toolbar.style.backgroundColor} != white`);
    if (metrics.toolbar.style.borderColor !== rgb.border) failures.push(`${testCase.name}: toolbar divider ${metrics.toolbar.style.borderColor} != canonical border`);
    if (metrics.heading.style.color !== rgb.navy) failures.push(`${testCase.name}: result count color ${metrics.heading.style.color} != AkarFinder navy`);
    if (!/résultat/.test(metrics.heading.text)) failures.push(`${testCase.name}: result count wording missing`);
    if (metrics.heading.scrollWidth > metrics.heading.clientWidth + 1) failures.push(`${testCase.name}: result count is visually clipped`);

    if (metrics.mobileSelectDisplay !== "none") failures.push(`${testCase.name}: legacy compressed mobile view select is visible`);
    if (metrics.switcher.style.display === "none") failures.push(`${testCase.name}: Liste/Mixte/Carte switcher is hidden`);
    if (metrics.buttons.map((button) => button.label).join("|") !== "Liste|Mixte|Carte") failures.push(`${testCase.name}: view labels are not Liste|Mixte|Carte`);
    if (!metrics.selected) failures.push(`${testCase.name}: no active view mode`);
    if (metrics.selected && metrics.selected.style.backgroundColor !== rgb.blue) failures.push(`${testCase.name}: active view ${metrics.selected.label} background ${metrics.selected.style.backgroundColor} != primary blue`);
    if (metrics.selected && metrics.selected.style.color !== rgb.white) failures.push(`${testCase.name}: active view text is not white`);

    if (metrics.sort.style.backgroundColor !== rgb.white) failures.push(`${testCase.name}: sort background ${metrics.sort.style.backgroundColor} != white`);
    if (metrics.sort.style.color !== rgb.navy) failures.push(`${testCase.name}: sort text ${metrics.sort.style.color} != navy`);
    if (metrics.sort.style.borderRadius !== "12px") failures.push(`${testCase.name}: sort radius ${metrics.sort.style.borderRadius} != 12px`);
    if (metrics.layout.rect.y - metrics.toolbar.rect.bottom > 12) failures.push(`${testCase.name}: first results layout starts ${metrics.layout.rect.y - metrics.toolbar.rect.bottom}px after toolbar (>12)`);

    if (phone) {
      if (metrics.actions.rect.y < metrics.countGroup.bottom + 5) failures.push(`${testCase.name}: mobile count and controls are still compressed onto one row`);
      if (!closeTo(metrics.actions.rect.x, metrics.toolbar.rect.x, 1) || !closeTo(metrics.actions.rect.right, metrics.toolbar.rect.right, 1)) failures.push(`${testCase.name}: mobile controls do not use the full toolbar width`);
      if (!closeTo(metrics.sort.rect.width, 136, 1)) failures.push(`${testCase.name}: mobile sort width ${metrics.sort.rect.width} != 136`);
      if (!closeTo(metrics.sort.rect.height, 48, 1)) failures.push(`${testCase.name}: mobile sort target ${metrics.sort.rect.height} != 48`);
      for (const button of metrics.buttons) {
        if (button.rect.height < 48) failures.push(`${testCase.name}: ${button.label} target ${button.rect.height} < 48`);
      }
      const gap = metrics.sort.rect.x - metrics.viewRoot.right;
      if (!closeTo(gap, 8, 1)) failures.push(`${testCase.name}: mobile view/sort gap ${gap} != 8`);
    } else {
      if (metrics.actions.rect.y > metrics.countGroup.y + 4) failures.push(`${testCase.name}: tablet/desktop controls are not aligned with result count`);
      if (!closeTo(metrics.sort.rect.height, 40, 1)) failures.push(`${testCase.name}: tablet/desktop sort height ${metrics.sort.rect.height} != 40`);
      if (!closeTo(metrics.viewRoot.width, 210, 1)) failures.push(`${testCase.name}: tablet/desktop view switch width ${metrics.viewRoot.width} != 210`);
      if (metrics.countGroup.right > metrics.actions.rect.x - 6) failures.push(`${testCase.name}: result count collides with toolbar actions`);
    }
  }

  const listButton = page.getByRole("button", { name: "Liste", exact: true });
  await listButton.click();
  if ((await listButton.getAttribute("aria-pressed")) !== "true") failures.push(`${testCase.name}: Liste did not become active`);
  if ((await page.locator("[data-search-view-layout]").getAttribute("data-search-view-layout")) !== "list") failures.push(`${testCase.name}: Liste did not switch the result layout`);

  const mapButton = page.getByRole("button", { name: "Carte", exact: true });
  await mapButton.click();
  if ((await mapButton.getAttribute("aria-pressed")) !== "true") failures.push(`${testCase.name}: Carte did not become active`);
  if ((await page.locator("[data-search-view-layout]").getAttribute("data-search-view-layout")) !== "map") failures.push(`${testCase.name}: Carte did not switch the result layout`);

  const mixButton = page.getByRole("button", { name: "Mixte", exact: true });
  await mixButton.click();
  await page.locator("[data-search-sort-select]").selectOption("price-asc");
  if ((await page.locator("[data-search-sort-select]").inputValue()) !== "price-asc") failures.push(`${testCase.name}: sort interaction failed`);

  const screenshot = path.join(outDir, `${testCase.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  results.push({ ...testCase, phone, desktop, metrics, screenshot });
  await context.close();
}

await browser.close();

const report = {
  lot: "UX-RESULTS-TOOLBAR-10OF10-1",
  variant,
  score: failures.length === 0 ? 10 : 0,
  pass: failures.length === 0,
  contract: {
    section: "Results toolbar only",
    predecessorHeaderFrozen: true,
    predecessorSearchControlsFrozen: true,
    palette: "AkarFinder navy + primary blue + white/neutrals",
    noVisibleOrangeOrBronze: true,
    resultCountPreserved: true,
    sortPreserved: ["Recommandé", "Prix croissant", "Prix décroissant"],
    viewsPreserved: ["Liste", "Mixte", "Carte"],
    mobileCountOnOwnLine: true,
    mobileCriticalTargetPx: 48,
    mobileViewSortGapPx: 8,
    tabletDesktopSingleRow: true,
    tabletDesktopViewWidthPx: 210,
    tabletDesktopControlHeightPx: 40,
    noHorizontalOverflow: true,
    firstResultsGapMaxPx: 12,
    chromiumViewports: cases.map(({ width, height }) => `${width}x${height}`),
  },
  failures,
  results,
};

await fs.writeFile(path.join(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
