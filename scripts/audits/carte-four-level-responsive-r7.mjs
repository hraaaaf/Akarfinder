import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3217";
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-four-level-responsive-r7";
await mkdir(outDir, { recursive: true });

const viewports = [
  { name: "390", width: 390, height: 844, mobile: true },
  { name: "430", width: 430, height: 932, mobile: true },
  { name: "768", width: 768, height: 900, mobile: false },
  { name: "1280", width: 1280, height: 900, mobile: false },
];

const report = { ok: false, cases: [], failure: null, generatedAt: new Date().toISOString() };

async function assertNoHorizontalOverflow(page, viewport, level) {
  const metrics = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  if (metrics.doc > 1 || metrics.body > 1) {
    throw new Error(`${viewport.name}/${level}: horizontal overflow ${JSON.stringify(metrics)}`);
  }
  return metrics;
}

async function shot(page, viewport, level) {
  await page.screenshot({
    path: `${outDir}/${viewport.name}-${level}.png`,
    fullPage: false,
  });
}

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
      const premium = page.locator("[data-premium-map]");
      await premium.waitFor({ state: "visible", timeout: 30000 });
      await page.waitForFunction(() => document.querySelector("[data-premium-map]")?.getAttribute("data-topology-state") === "ready", null, { timeout: 30000 });

      const levels = {};

      // COUNTRY
      if (await premium.getAttribute("data-map-level") !== "national") throw new Error(`${viewport.name}: expected national level`);
      if (await page.locator("[data-map-side-panel]").count() !== 1) throw new Error(`${viewport.name}: country side panel missing`);
      levels.country = {
        overflow: await assertNoHorizontalOverflow(page, viewport, "country"),
        regionCount: await page.locator("[data-region-list-slug]").count(),
      };
      if (levels.country.regionCount !== 12) throw new Error(`${viewport.name}: expected 12 regions, got ${levels.country.regionCount}`);
      await shot(page, viewport, "country");

      // REGION
      await page.locator('[data-region-list-slug="casablanca-settat"]').click();
      await page.waitForFunction(() => document.querySelector("[data-premium-map]")?.getAttribute("data-map-level") === "region", null, { timeout: 10000 });
      const backToCountry = page.getByRole("button", { name: /^Maroc$/i });
      await backToCountry.first().waitFor({ state: "visible", timeout: 10000 });
      const casablancaEntry = page.locator('[data-city-list-slug="casablanca"]');
      await casablancaEntry.first().waitFor({ state: "visible", timeout: 10000 });
      levels.region = {
        overflow: await assertNoHorizontalOverflow(page, viewport, "region"),
        cityCount: await page.locator("[data-city-list-slug]").count(),
      };
      await shot(page, viewport, "region");

      // CITY
      await casablancaEntry.first().click();
      await page.waitForFunction(() => document.querySelector("[data-premium-map]")?.getAttribute("data-map-level") === "city", null, { timeout: 10000 });
      await page.locator("[data-neighborhood-canonical-index]").waitFor({ state: "visible", timeout: 10000 });
      const maarifCard = page.locator('[data-canonical-neighborhood="maarif"]');
      await maarifCard.waitFor({ state: "visible", timeout: 10000 });
      if (await page.getByRole("button", { name: /Casablanca-Settat/i }).count() < 1) throw new Error(`${viewport.name}: city back-to-region control missing`);
      levels.city = {
        overflow: await assertNoHorizontalOverflow(page, viewport, "city"),
        neighborhoodCount: await page.locator("[data-canonical-neighborhood]").count(),
      };
      await shot(page, viewport, "city");

      // select Maârif then enter neighborhood
      await maarifCard.click();
      const explorer = page.locator('[data-explorer-link="maarif"]');
      await explorer.waitFor({ state: "visible", timeout: 10000 });
      const href = await explorer.getAttribute("href");
      const expected = "/map?region=casablanca-settat&city=casablanca&district=maarif&layer=explore";
      if (href !== expected) throw new Error(`${viewport.name}: Maârif explorer href mismatch ${href}`);
      await Promise.all([
        page.waitForURL((url) =>
          url.pathname === "/map" &&
          url.searchParams.get("region") === "casablanca-settat" &&
          url.searchParams.get("city") === "casablanca" &&
          url.searchParams.get("district") === "maarif" &&
          url.searchParams.get("layer") === "explore",
          { timeout: 15000 },
        ),
        explorer.click(),
      ]);

      // NEIGHBORHOOD
      const maplibre = page.locator('[data-maplibre-spike][data-maplibre-city="casablanca"][data-maplibre-district="maarif"]');
      await maplibre.waitFor({ state: "visible", timeout: 20000 });
      await page.waitForFunction(() => {
        const shell = document.querySelector('[data-maplibre-spike][data-maplibre-city="casablanca"][data-maplibre-district="maarif"]');
        return shell?.getAttribute("data-maplibre-render-state") === "ready";
      }, null, { timeout: 25000 });

      const rail = page.locator("[data-maarif-target-rail]");
      await rail.waitFor({ state: "visible", timeout: 10000 });
      if (await page.locator("[data-p4-map-decision-rail]").count() !== 0) throw new Error(`${viewport.name}: duplicate neighborhood rail detected`);
      if (await page.getByRole("heading", { name: "Maârif", exact: true }).count() !== 1) throw new Error(`${viewport.name}: expected one Maârif heading`);
      const back = page.locator("[data-vivre-ici-territory-back]");
      await back.waitFor({ state: "visible", timeout: 10000 });
      const cta = rail.getByRole("link", { name: /Voir les biens disponibles à Maârif/i });
      await cta.waitFor({ state: "visible", timeout: 10000 });

      const railBox = await rail.boundingBox();
      if (!railBox) throw new Error(`${viewport.name}: neighborhood rail box missing`);
      if (railBox.x < -1 || railBox.x + railBox.width > viewport.width + 1 || railBox.y < -1 || railBox.y + railBox.height > viewport.height + 1) {
        throw new Error(`${viewport.name}: neighborhood rail escapes viewport ${JSON.stringify(railBox)}`);
      }
      levels.neighborhood = {
        overflow: await assertNoHorizontalOverflow(page, viewport, "neighborhood"),
        railBox,
        verifiedLandmarkCount: Number(await maplibre.getAttribute("data-maplibre-verified-landmark-count") || "0"),
      };
      if (levels.neighborhood.verifiedLandmarkCount < 2) throw new Error(`${viewport.name}: expected at least 2 verified landmarks`);
      await shot(page, viewport, "neighborhood");

      if (pageErrors.length) throw new Error(`${viewport.name}: browser page errors ${JSON.stringify(pageErrors)}`);
      report.cases.push({ viewport: viewport.name, levels });
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
