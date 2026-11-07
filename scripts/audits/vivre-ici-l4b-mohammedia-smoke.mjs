import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3213";
const output = (process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-national-neighborhoods-n2-after") + "/l4b";
const viewports = [
  { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
  { name: "768", width: 768, height: 900 },
  { name: "1280", width: 1280, height: 900 },
];
await mkdir(output, { recursive: true });

const report = { ok: false, source: null, cases: [], failure: null };
const sourceResponse = await fetch(baseUrl + "/api/geo/national-territories?city=mohammedia");
if (!sourceResponse.ok) throw new Error("L4-B source Mohammedia HTTP " + sourceResponse.status);
const data = await sourceResponse.json();
if (data.place?.slug !== "mohammadia" || data.neighborhoods?.length !== 214 ||
    data.meta?.centeredNeighborhoodCount !== 5 ||
    data.meta?.certifiedNeighborhoodBoundaryCount !== 0) {
  throw new Error("L4-B wrong V5 source contract " + JSON.stringify(data.meta));
}
const sample = data.neighborhoods.find(x => x.center && x.name?.length > 2);
if (!sample) throw new Error("L4-B no sourced neighborhood with a center");
report.source = { citySlug: data.place.slug, sourceNeighborhoods: data.neighborhoods.length,
  sourceCenters: data.meta.centeredNeighborhoodCount, chosenSourcedNeighborhood: sample.name };

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const mobile = viewport.width <= 430;
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", e => pageErrors.push(String(e)));
    try {
      await page.goto(baseUrl + "/map?city=mohammedia&layer=explore",
        { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.locator('[data-akarfinder-national-map][data-akarfinder-national-view="city"]')
        .waitFor({ state: "visible", timeout: 30000 });
      await page.waitForFunction(() => {
        const map = window.__AKARFINDER_NATIONAL_MAP__;
        return Boolean(map?.isStyleLoaded()) && Boolean(map?.areTilesLoaded()) &&
          map.queryRenderedFeatures().length >= 10;
      }, null, { timeout: 30000 });
      const overlay = page.locator('[data-akarfinder-national-neighborhood-overlay][data-city="mohammadia"]');
      const overlayShown = await overlay.waitFor({ state: "attached", timeout: 8000 })
        .then(() => true, () => false);
      await page.screenshot({ path: output + "/mohammedia-city-" + viewport.name + ".png", fullPage: false });
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      let sourcedSelection = false;
      if (overlayShown) {
        const search = page.getByRole("textbox", { name: /Rechercher un quartier à /i });
        await search.fill(sample.name);
        const suggestion = page.locator('[data-akarfinder-neighborhood-suggestion="' + sample.slug + '"]');
        await suggestion.waitFor({ state: "visible", timeout: 10000 });
        await suggestion.click();
        await page.waitForURL(url => url.searchParams.get("city") === "mohammedia" &&
          url.searchParams.get("district") === sample.slug, { timeout: 10000 });
        sourcedSelection = true;
        await page.screenshot({ path: output + "/mohammedia-selected-" + viewport.name + ".png", fullPage: false });
      }
      report.cases.push({ viewport: viewport.name, overlayShown, sourcedSelection, overflow, pageErrors });
    } catch (error) {
      report.failure = { viewport: viewport.name, error: String(error), pageErrors };
      throw error;
    } finally {
      await context.close();
    }
  }
  report.ok = report.cases.length === 4 &&
    report.cases.every(c => c.overlayShown && c.sourcedSelection &&
      c.overflow <= 1 && c.pageErrors.length === 0);
  if (!report.ok) {
    report.failure = { check: "L4-B Mohammedia city overlay source continuity",
      failedViewports: report.cases.filter(c => !c.overlayShown || !c.sourcedSelection || c.overflow > 1 || c.pageErrors.length).map(c => c.viewport) };
    throw new Error("L4-B city overlay missing or browser QA failed: " + JSON.stringify(report.failure));
  }
} finally {
  await browser.close();
  await writeFile(output + "/report.json", JSON.stringify(report, null, 2));
}
