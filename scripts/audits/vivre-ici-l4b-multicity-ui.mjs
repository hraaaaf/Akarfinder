import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

// L4-B before/after evidence: 8 sourced cities x 4 viewports, plus
// 17 real neighborhood choices (8 mapped, 8 without source center, 1 extra).
// Only the V5 catalog determines selectable districts. No invented pin/geometry.
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3213";
const outDir = process.env.L4B_AUDIT_OUTPUT_DIR ||
  (process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-national-neighborhoods-n2-after") + "/l4b";
await mkdir(outDir, { recursive: true });

const cities = ["casablanca", "rabat", "marrakech", "tanger", "agadir", "fes", "kenitra", "mohammedia"];
const viewports = [
  { name: "390", width: 390, height: 844, mobile: true },
  { name: "430", width: 430, height: 932, mobile: true },
  { name: "768", width: 768, height: 900, mobile: false },
  { name: "1280", width: 1280, height: 900, mobile: false },
];
const report = { ok: false, sourceCities: [], cases: [], selections: [], failure: null };
const sourceByCity = new Map();

function containsText(value) {
  return typeof value === "string" && value.trim().length >= 3;
}

for (const city of cities) {
  const response = await fetch(baseUrl + "/api/geo/national-territories?city=" + city);
  if (!response.ok) throw new Error("L4-B source " + city + " HTTP " + response.status);
  const payload = await response.json();
  const expectedSlug = city === "mohammedia" ? "mohammadia" : city;
  if (payload.view !== "city" || payload.place?.slug !== expectedSlug) {
    throw new Error("L4-B source identity mismatch: " + city + " => " + payload.place?.slug);
  }
  if (!Array.isArray(payload.neighborhoods) || payload.neighborhoods.length < 2 ||
      payload.certifiedNeighborhoodBoundaries?.features?.length !== 0) {
    throw new Error("L4-B missing source catalog or unauthorized polygon: " + city);
  }
  const mapped = payload.neighborhoods.find(item => item.center && containsText(item.name));
  const withoutCenter = payload.neighborhoods.find(item => !item.center && containsText(item.name) && item.slug !== mapped?.slug);
  if (!mapped || !withoutCenter) throw new Error("L4-B not enough grounded representative neighborhoods: " + city);

  const candidates = [mapped, withoutCenter];
  if (city === "casablanca") {
    const third = payload.neighborhoods.find(item => item.slug === "maarif" && !candidates.some(x => x.slug === item.slug))
      ?? payload.neighborhoods.find(item => item.center && containsText(item.name) && !candidates.some(x => x.slug === item.slug));
    if (!third) throw new Error("L4-B Casablanca third sourced neighborhood missing");
    candidates.push(third);
  }
  sourceByCity.set(city, { payload, candidates });
  report.sourceCities.push({
    city, canonicalSlug: expectedSlug, label: payload.place.name,
    sourceNeighborhoods: payload.neighborhoods.length,
    sourcedCenters: payload.meta.centeredNeighborhoodCount,
    publishedNeighborhoodPolygons: payload.meta.certifiedNeighborhoodBoundaryCount,
    selections: candidates.map(x => ({ slug: x.slug, name: x.name, hasCenter: Boolean(x.center), sourceKinds: x.sourceKinds })),
  });
}

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.mobile, hasTouch: viewport.mobile, deviceScaleFactor: 1,
    });
    try {
      for (const city of cities) {
        const { payload, candidates } = sourceByCity.get(city);
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", error => errors.push(String(error)));
        const row = {
          city, viewport: viewport.name, canonicalSlug: payload.place.slug,
          sourceNeighborhoods: payload.neighborhoods.length,
          state: "started", selection: null, overflow: null, error: null,
        };
        const prefix = outDir + "/" + city + "-" + viewport.name;
        try {
          await page.goto(baseUrl + "/map?city=" + encodeURIComponent(city) + "&layer=explore",
            { waitUntil: "domcontentloaded", timeout: 30000 });

          // Take a BEFORE capture even if overlay is missing: never hide real gaps.
          try {
            await page.locator('[data-akarfinder-national-map][data-akarfinder-national-view="city"]')
              .waitFor({ state: "visible", timeout: 15000 });
          } catch {
            await page.screenshot({ path: prefix + "-city-before.png", fullPage: false });
            throw new Error("city map failed to render a source-backed city view");
          }
          await page.screenshot({ path: prefix + "-city-before.png", fullPage: false });

          const overlay = page.locator('[data-akarfinder-national-neighborhood-overlay][data-city="' + payload.place.slug + '"]');
          await overlay.waitFor({ state: "visible", timeout: 11000 });
          const input = page.getByRole("textbox", { name: "Rechercher un quartier à " + payload.place.name });
          await input.waitFor({ state: "visible", timeout: 5000 });
          await page.waitForFunction(() => {
            const map = window.__AKARFINDER_NATIONAL_MAP__;
            return Boolean(map?.isStyleLoaded() &&
              map?.getSource("akarfinder-national-neighborhood-points") &&
              map?.getLayer("akarfinder-national-neighborhood-dots") &&
              !map?.getLayer("akarfinder-national-neighborhood-fill"));
          }, null, { timeout: 12000 });

          row.overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth - document.documentElement.clientWidth);
          if (row.overflow > 1) throw new Error("horizontal overflow " + row.overflow);
          await page.screenshot({ path: prefix + "-city-ready.png", fullPage: false });
          row.state = "city_ready";

          // Exactly 17 selections across the audit: 8 centers at 390,
          // 8 missing-center labels at 1280, + Casablanca extra at 768.
          const candidate = viewport.name === "390" ? candidates[0] :
            viewport.name === "1280" ? candidates[1] :
            viewport.name === "768" && city === "casablanca" ? candidates[2] : null;
          if (candidate) {
            await input.fill(candidate.name);
            const suggestion = page.locator('[data-akarfinder-neighborhood-suggestion="' + candidate.slug + '"]');
            await suggestion.waitFor({ state: "visible", timeout: 7000 });
            await suggestion.click();
            await page.waitForURL(url =>
              url.searchParams.get("city") === city && url.searchParams.get("district") === candidate.slug,
              { timeout: 12000 });
            const state = await page.waitForFunction(({ slug }) => {
              const maplibre = document.querySelector('[data-maplibre-spike][data-maplibre-district="' + slug + '"]');
              const preview = document.querySelector('[data-akarfinder-neighborhood-preview="' + slug + '"]');
              if (maplibre) return "maplibre";
              if (preview) return "preview";
              return null;
            }, { slug: candidate.slug }, { timeout: 17000 });
            const mode = await state.jsonValue();
            if (!candidate.center && mode === "maplibre") {
              throw new Error("unsourced center was assigned a maplibre location " + city + "/" + candidate.slug);
            }
            if (!candidate.center && mode === "preview") {
              const preview = page.locator('[data-akarfinder-neighborhood-preview="' + candidate.slug + '"]');
              if (!(await preview.innerText()).includes("Repère cartographique indisponible")) {
                throw new Error("no-center status hidden for " + city + "/" + candidate.slug);
              }
            }
            const afterOverflow = await page.evaluate(() =>
              document.documentElement.scrollWidth - document.documentElement.clientWidth);
            if (afterOverflow > 1) throw new Error("district horizontal overflow " + afterOverflow);
            await page.screenshot({ path: prefix + "-selected-" + candidate.slug + ".png", fullPage: false });
            row.selection = { slug: candidate.slug, name: candidate.name, mode, hasCenter: Boolean(candidate.center), overflow: afterOverflow };
            report.selections.push({ city, viewport: viewport.name, ...row.selection });
          }
          if (errors.length) throw new Error("browser JS errors: " + JSON.stringify(errors));
          row.state = "passed";
        } catch (error) {
          row.state = "failed";
          row.error = String(error);
          if (!report.failure) report.failure = { city, viewport: viewport.name, error: String(error) };
          try { await page.screenshot({ path: prefix + "-failure.png", fullPage: false }); } catch {}
        } finally {
          report.cases.push(row);
          await page.close();
        }
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  report.ok = report.cases.length === 32 &&
    report.cases.every(row => row.state === "passed") &&
    report.selections.length === 17;
  await writeFile(outDir + "/report.json", JSON.stringify(report, null, 2));
}
if (!report.ok) {
  const failed = report.cases.filter(x => x.state !== "passed");
  throw new Error("L4-B national city→district UI not certified: " +
    JSON.stringify({ failed: failed.map(x => ({ city: x.city, viewport: x.viewport, error: x.error })), selections: report.selections.length }));
}
