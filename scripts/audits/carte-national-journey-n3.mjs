import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3213";
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-national-journey-n3";
await mkdir(outDir, { recursive: true });

const viewports = [
  { name: "390", width: 390, height: 844, mobile: true },
  { name: "1280", width: 1280, height: 900, mobile: false },
];

const report = { ok: false, cases: [], failure: null };

const nationalResponse = await fetch(`${baseUrl}/api/geo/national-territories`);
if (!nationalResponse.ok) throw new Error(`national API ${nationalResponse.status}`);
const nationalPayload = await nationalResponse.json();
const casablanca = nationalPayload.places?.find((place) => place.slug === "casablanca");
if (!casablanca?.center || !Number.isFinite(casablanca.center.lng) || !Number.isFinite(casablanca.center.lat)) {
  throw new Error("Casablanca national center missing");
}

async function waitForNationalView(page, view) {
  await page.locator(`[data-akarfinder-national-map][data-akarfinder-national-view="${view}"]`).waitFor({ state: "visible", timeout: 30000 });
  await page.locator(".maplibregl-canvas").first().waitFor({ state: "visible", timeout: 30000 });
  await page.waitForFunction((expectedView) => {
    const shell = document.querySelector("[data-akarfinder-national-map]");
    const map = window.__AKARFINDER_NATIONAL_MAP__;
    return shell?.getAttribute("data-akarfinder-national-view") === expectedView && Boolean(map?.isStyleLoaded());
  }, view, { timeout: 30000 });
}

async function selectCasablancaFromNationalMap(page) {
  const clickPoint = await page.evaluate(({ lng, lat }) => {
    const map = window.__AKARFINDER_NATIONAL_MAP__;
    if (!map?.isStyleLoaded()) throw new Error("national map not ready");
    const projected = map.project([lng, lat]);
    const rect = map.getCanvas().getBoundingClientRect();
    return { x: rect.left + projected.x, y: rect.top + projected.y };
  }, casablanca.center);

  await page.mouse.click(clickPoint.x, clickPoint.y);

  const preview = page.locator('[data-akarfinder-city-preview="casablanca"]');
  const outcome = await Promise.race([
    page.waitForURL((url) => url.pathname === "/map" && url.searchParams.get("city") === "casablanca", { timeout: 10000 }).then(() => "city"),
    preview.waitFor({ state: "visible", timeout: 10000 }).then(() => "preview"),
  ]);

  if (outcome === "preview") {
    const alreadySelected = new URL(page.url());
    if (alreadySelected.pathname === "/map" && alreadySelected.searchParams.get("city") === "casablanca") return;

    try {
      await preview.getByRole("button", { name: /Explorer Casablanca/i }).click({ timeout: 10000 });
    } catch (error) {
      const afterRace = new URL(page.url());
      if (afterRace.pathname !== "/map" || afterRace.searchParams.get("city") !== "casablanca") throw error;
    }

    await page.waitForURL((url) => url.pathname === "/map" && url.searchParams.get("city") === "casablanca", { timeout: 10000 });
  }
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

    if (viewport.mobile) {
      await context.addInitScript(() => {
        const nativeMatchMedia = window.matchMedia.bind(window);
        Object.defineProperty(window, "matchMedia", {
          configurable: true,
          value: (query) => {
            const result = nativeMatchMedia(query);
            if (query !== "(pointer: coarse)") return result;
            return new Proxy(result, {
              get(target, property) {
                if (property === "matches") return true;
                const value = Reflect.get(target, property, target);
                return typeof value === "function" ? value.bind(target) : value;
              },
            });
          },
        });
      });
    }

    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error)));

    try {
      await page.goto(`${baseUrl}/map?layer=explore`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await waitForNationalView(page, "morocco");
      await selectCasablancaFromNationalMap(page);
      await waitForNationalView(page, "city");

      const neighborhoodOverlay = page.locator('[data-akarfinder-national-neighborhood-overlay][data-city="casablanca"]');
      await neighborhoodOverlay.waitFor({ state: "attached", timeout: 20000 });
      const input = page.getByRole("textbox", { name: "Rechercher un quartier à Casablanca" });
      await input.waitFor({ state: "visible", timeout: 10000 });
      await input.fill("Maârif");
      const suggestion = page.locator('[data-akarfinder-neighborhood-suggestion="maarif"]');
      await suggestion.waitFor({ state: "visible", timeout: 5000 });
      await suggestion.click();

      await page.waitForURL((url) => url.pathname === "/map" && url.searchParams.get("city") === "casablanca" && url.searchParams.get("district") === "maarif", { timeout: 10000 });
      const maplibre = page.locator('[data-maplibre-spike][data-maplibre-city="casablanca"][data-maplibre-district="maarif"]');
      await maplibre.waitFor({ state: "visible", timeout: 15000 });
      await page.waitForFunction(() => {
        const shell = document.querySelector('[data-maplibre-spike][data-maplibre-city="casablanca"][data-maplibre-district="maarif"]');
        return shell?.getAttribute("data-maplibre-render-state") === "ready";
      }, null, { timeout: 25000 });

      const rail = page.locator("[data-p4-map-decision-rail]");
      await rail.waitFor({ state: "visible", timeout: 10000 });
      const handoff = rail.getByRole("link", { name: /Voir les biens disponibles à Maârif/i });
      const href = await handoff.getAttribute("href");
      if (!href) throw new Error("search handoff href missing");
      const handoffUrl = new URL(href, baseUrl);
      if (handoffUrl.pathname !== "/search" || handoffUrl.searchParams.get("city") !== "Casablanca" || handoffUrl.searchParams.get("district") !== "Maârif") {
        throw new Error(`search handoff invalid ${handoffUrl.pathname}${handoffUrl.search}`);
      }

      await Promise.all([
        page.waitForURL((url) => url.pathname === "/search" && url.searchParams.get("city") === "Casablanca" && url.searchParams.get("district") === "Maârif", { timeout: 30000 }),
        handoff.click(),
      ]);
      await page.locator("[data-search-results-section]").waitFor({ state: "visible", timeout: 30000 });
      await page.locator("[data-search-controls-section]").waitFor({ state: "visible", timeout: 30000 });

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) throw new Error(`search horizontal overflow ${overflow}`);
      if (pageErrors.length) throw new Error(`browser page errors ${JSON.stringify(pageErrors)}`);

      report.cases.push({
        viewport: viewport.name,
        nationalView: true,
        citySelection: "casablanca",
        districtSelection: "maarif",
        maplibreReady: true,
        searchHandoff: handoffUrl.pathname + handoffUrl.search,
        searchRendered: true,
        overflow,
      });
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
