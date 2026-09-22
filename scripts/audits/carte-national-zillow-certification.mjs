import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3212";
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-national-zillow-after";
await mkdir(outDir, { recursive: true });

const viewports = [
  { name: "390", width: 390, height: 844, mobile: true },
  { name: "430", width: 430, height: 932, mobile: true },
  { name: "768", width: 768, height: 900, mobile: false },
  { name: "1280", width: 1280, height: 900, mobile: false },
];
const lockedHubs = ["casablanca","rabat","tanger","marrakech","fes","agadir","kenitra","mohammedia"];
const report = { ok: false, api: null, cases: [], failure: null };

const apiResponse = await fetch(`${baseUrl}/api/geo/national-territories`);
if (!apiResponse.ok) throw new Error(`national API ${apiResponse.status}`);
const api = await apiResponse.json();
if (api.view !== "morocco") throw new Error(`national view ${api.view}`);
if (api.meta?.displayPolicy !== "COUNTRY_HUBS_ONLY") throw new Error(`displayPolicy ${api.meta?.displayPolicy}`);
if (api.meta?.countryHubCount !== 8 || api.meta?.cityCount !== 8) throw new Error(`country hubs ${api.meta?.countryHubCount}/${api.meta?.cityCount}`);
if (api.meta?.regionCount !== 12) throw new Error(`regionCount ${api.meta?.regionCount}`);
if (api.meta?.canonicalCityCount !== 19) throw new Error(`canonicalCityCount ${api.meta?.canonicalCityCount}`);
const apiSlugs = api.places.map((place) => place.slug);
for (const slug of lockedHubs) {
  if (!apiSlugs.includes(slug)) throw new Error(`locked hub missing ${slug}`);
}
if (api.places.some((place) => !lockedHubs.includes(place.slug))) throw new Error("unexpected country-level locality");
if (api.places.some((place) => !place.center || !Number.isFinite(place.center.lng) || !Number.isFinite(place.center.lat))) {
  throw new Error("country hub center missing");
}
report.api = {
  countryHubCount: api.meta.countryHubCount,
  regionCount: api.meta.regionCount,
  canonicalCityCount: api.meta.canonicalCityCount,
  slugs: apiSlugs,
};

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.mobile,
      hasTouch: viewport.mobile,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    try {
      await page.goto(`${baseUrl}/map?layer=explore`, { waitUntil: "domcontentloaded", timeout: 30000 });
      const shell = page.locator("[data-premium-map]");
      await shell.waitFor({ state: "visible", timeout: 30000 });
      await page.waitForFunction(() => {
        const el = document.querySelector("[data-premium-map]");
        return el?.getAttribute("data-topology-state") === "ready" &&
          el?.getAttribute("data-db-mode") === "canonical-registry" &&
          el?.getAttribute("data-map-level") === "national";
      }, null, { timeout: 30000 });

      const regions = await page.locator("[data-region-list-slug]").count();
      if (regions !== 12) throw new Error(`region UI count ${regions}`);
      const labelCount = Number(await shell.getAttribute("data-national-city-label-count"));
      if (!Number.isFinite(labelCount) || labelCount < 1 || labelCount > 8) throw new Error(`national label count ${labelCount}`);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) throw new Error(`national horizontal overflow ${overflow}`);
      await page.screenshot({ path: `${outDir}/country-${viewport.name}-after.png`, fullPage: false });

      await page.locator('[data-region-list-slug="casablanca-settat"]').click();
      await page.waitForFunction(() => document.querySelector("[data-premium-map]")?.getAttribute("data-map-level") === "region", null, { timeout: 10000 });
      const casa = page.locator('[data-city-list-slug="casablanca"]');
      await casa.waitFor({ state: "visible", timeout: 10000 });
      await page.screenshot({ path: `${outDir}/region-casablanca-settat-${viewport.name}-after.png`, fullPage: false });

      await casa.click();
      await page.waitForFunction(() => document.querySelector("[data-premium-map]")?.getAttribute("data-map-level") === "city", null, { timeout: 10000 });
      const maarif = page.locator('[data-canonical-neighborhood="maarif"]');
      await maarif.waitFor({ state: "visible", timeout: 10000 });
      const explorer = page.locator('[data-explorer-link="maarif"]');
      const href = await explorer.getAttribute("href");
      const expected = "/map?region=casablanca-settat&city=casablanca&district=maarif&layer=explore";
      if (href !== expected) throw new Error(`Maarif explorer href ${href}`);
      await page.screenshot({ path: `${outDir}/city-casablanca-${viewport.name}-after.png`, fullPage: false });

      if (pageErrors.length) throw new Error(`page errors ${JSON.stringify(pageErrors)}`);
      report.cases.push({ viewport: viewport.name, regions, labelCount, overflow, regionDrilldown: true, cityDrilldown: true, quartierHandoff: href });
    } catch (error) {
      report.failure = { viewport: viewport.name, error: String(error), url: page.url(), pageErrors };
      throw error;
    } finally {
      await context.close();
    }
  }
  report.ok = true;
} finally {
  await browser.close();
  await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2));
}
