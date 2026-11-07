import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = join(process.cwd(), "artifacts", "p1a6-map-responsive");

const routes = [
  { path: "/map", slug: "map", experience: "national" },
  { path: "/map?city=Rabat", slug: "map-rabat", experience: "intelligence" },
  { path: "/map?city=Rabat&district=Agdal", slug: "map-rabat-agdal", experience: "maplibre", citySlug: "rabat", districtSlug: "agdal" },
  { path: "/map?city=casablanca&district=maarif&layer=explore", slug: "map-casablanca-maarif", experience: "maplibre", citySlug: "casablanca", districtSlug: "maarif" },
] as const;

const viewports = [
  { width: 390, height: 844, label: "390" },
  { width: 430, height: 932, label: "430" },
  { width: 768, height: 900, label: "768" },
  { width: 1280, height: 900, label: "1280" },
] as const;

type Finding = { route: string; viewport: string; check: string; detail: string };

async function main() {
  mkdirSync(outputDir, { recursive: true });
  const findings: Finding[] = [];
  let screenshotsCaptured = 0;
  const browser = await chromium.launch({ headless: true });

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: "reduce", colorScheme: "light" });

      for (const route of routes) {
        const page = await context.newPage();
        const pageErrors: string[] = [];
        page.on("pageerror", (error) => pageErrors.push(String(error)));

        const response = await page.goto(`${baseUrl}${route.path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
        if (!response || response.status() >= 500) {
          findings.push({ route: route.path, viewport: viewport.label, check: "http-status", detail: `Unexpected status ${response?.status() ?? "none"}` });
        }

        // /map is the premium national SVG, not the MapLibre city/district renderer.
        if (route.experience !== "national") {
          try {
            await page.locator(".maplibregl-canvas").waitFor({ state: "visible", timeout: 20_000 });
          } catch {
            findings.push({ route: route.path, viewport: viewport.label, check: "map-canvas", detail: "MapLibre canvas missing" });
          }
        }

        const documentWidth = await page.locator("html").evaluate((element) => element.scrollWidth);
        if (documentWidth > viewport.width + 2) {
          findings.push({ route: route.path, viewport: viewport.label, check: "horizontal-overflow", detail: `${documentWidth}px document for ${viewport.width}px viewport` });
        }

        if (route.experience === "national") {
          // PremiumInteractiveMap uses local TopoJSON (12 regions) and an SVG map;
          // it intentionally does not call /api/geo/national-territories on initial /map.
          const national = page.locator("[data-premium-map]");
          try {
            await national.waitFor({ state: "visible", timeout: 15_000 });
            await page.waitForFunction(
              () => document.querySelector("[data-premium-map]")?.getAttribute("data-topology-state") === "ready",
              null,
              { timeout: 20_000 },
            );
          } catch {
            findings.push({ route: route.path, viewport: viewport.label, check: "premium-national", detail: "Premium SVG map missing or topology not ready" });
          }
          const regionCount = await page.locator("[data-region-slug]").count();
          if (regionCount !== 12) {
            findings.push({ route: route.path, viewport: viewport.label, check: "national-regions", detail: `Expected 12 actual region paths, found ${regionCount}` });
          }
          const regionListCount = await page.locator("[data-region-list-slug]").count();
          if (regionListCount !== 12) {
            findings.push({ route: route.path, viewport: viewport.label, check: "national-region-list", detail: `Expected 12 region controls, found ${regionListCount}` });
          }
        } else if (route.experience === "intelligence") {
          const intelligenceMap = page.locator('[data-akarfinder-market-intelligence-map]');
          try {
            await intelligenceMap.waitFor({ state: "visible", timeout: 15_000 });
          } catch {
            findings.push({ route: route.path, viewport: viewport.label, check: "market-intelligence-map", detail: "Rabat city intelligence map container missing" });
          }
        } else {
          const maplibre = page.locator(`[data-maplibre-spike][data-maplibre-city="${route.citySlug}"][data-maplibre-district="${route.districtSlug}"]`);
          try {
            await maplibre.waitFor({ state: "visible", timeout: 15_000 });
            await page.waitForFunction(
              ({ citySlug, districtSlug }) => {
                const shell = document.querySelector(`[data-maplibre-spike][data-maplibre-city="${citySlug}"][data-maplibre-district="${districtSlug}"]`);
                return shell?.getAttribute("data-maplibre-render-state") === "ready";
              },
              { citySlug: route.citySlug, districtSlug: route.districtSlug },
              { timeout: 20_000 },
            );
          } catch {
            findings.push({ route: route.path, viewport: viewport.label, check: "maplibre-neighborhood", detail: "Canonical Rabat/Agdal MapLibre experience missing or not ready" });
          }
          try {
            await page.locator("[data-p4-map-decision-rail]").waitFor({ state: "visible", timeout: 10_000 });
          } catch {
            findings.push({ route: route.path, viewport: viewport.label, check: "decision-rail", detail: "Vivre Ici decision rail missing" });
          }
          if (route.citySlug === "casablanca" && route.districtSlug === "maarif") {
            try {
              await page.getByText("Aucun repère suffisamment récent n’est actuellement disponible", { exact: false })
                .waitFor({ state: "visible", timeout: 15_000 });
            } catch {
              findings.push({ route: route.path, viewport: viewport.label, check: "fresh-poi-empty-state", detail: "Maârif has no sourced recent POIs but empty-state disclosure was not visible" });
            }
          }
        }

        if (pageErrors.length > 0) {
          findings.push({ route: route.path, viewport: viewport.label, check: "page-errors", detail: pageErrors.join(" | ") });
        }

        await page.screenshot({ path: join(outputDir, `${route.slug}-${viewport.label}.png`), fullPage: false });
        screenshotsCaptured += 1;

        if (route.experience === "national") {
          // Certify the real national drilldown that used to publish fabricated price/POI counts.
          try {
            await page.locator('[data-region-list-slug="casablanca-settat"]').click({ timeout: 12_000 });
            await page.locator('[data-city-list-slug="casablanca"]').click({ timeout: 12_000 });
            const maarifButton = page.locator("[data-map-side-panel] button").filter({ hasText: "Maârif" }).first();
            await maarifButton.click({ timeout: 12_000 });
            const selected = page.locator('[data-selected-quartier="maarif"]');
            await selected.waitFor({ state: "visible", timeout: 12_000 });
            const evidence = selected.locator('[data-local-evidence="unavailable"]');
            await evidence.waitFor({ state: "visible", timeout: 12_000 });
            const selectedText = await selected.innerText();
            const allDistrictText = await page.locator("[data-map-side-panel]").innerText();
            if (!selectedText.includes("Aucune statistique non sourcée") ||
                /DH\\/m²|repère vérifié|17\\s?600|15 repères/i.test(allDistrictText)) {
              findings.push({ route: route.path, viewport: viewport.label, check: "mock-local-data", detail: "National district panel still contains unsupported metrics or lacks its unavailable state" });
            }
          } catch (error) {
            findings.push({ route: route.path, viewport: viewport.label, check: "national-drilldown", detail: String(error).slice(0, 400) });
          }
          await page.screenshot({ path: join(outputDir, `map-casablanca-maarif-selection-${viewport.label}.png`), fullPage: false });
          screenshotsCaptured += 1;
        }

        await page.close();
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  const summary = { routes: routes.length, viewports: viewports.map((viewport) => viewport.label), screenshots: screenshotsCaptured, findings };
  writeFileSync(join(outputDir, "report.json"), JSON.stringify(summary, null, 2));
  writeFileSync(join(outputDir, "report.md"), [
    "# P1A.6 Map Responsive Audit",
    "",
    `Routes: ${summary.routes}`,
    `Viewports: ${summary.viewports.join(", ")}`,
    `Screenshots: ${summary.screenshots}`,
    `Findings: ${summary.findings.length}`,
    "",
    ...summary.findings.map((finding) => `- [${finding.viewport}] ${finding.route} — ${finding.check}: ${finding.detail}`),
    "",
  ].join("\n"));

  if (findings.length > 0) {
    console.error(`P1A.6 responsive audit failed with ${findings.length} finding(s)`);
    process.exitCode = 1;
  } else {
    console.log(`P1A.6 responsive audit passed: ${summary.screenshots} screenshots, 0 findings`);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
