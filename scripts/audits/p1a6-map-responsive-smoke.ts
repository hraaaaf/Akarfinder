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
          const nationalCredits = page.locator('[data-premium-map-attribution]');
          try {
            await nationalCredits.waitFor({ state: "visible", timeout: 12_000 });
            const osmLink = nationalCredits.locator('a[href="https://www.openstreetmap.org/copyright"]');
            const boundaryLink = nationalCredits.locator('a[href="https://www.geoboundaries.org/"]');
            if (!(await osmLink.isVisible()) || !(await boundaryLink.isVisible())) throw new Error("real attribution links hidden");
            if (viewport.width <= 430) {
              const box = await nationalCredits.boundingBox();
              if (!box || box.y + box.height > viewport.height - 76) {
                throw new Error(`national attribution obscured by fixed navigation: ${JSON.stringify(box)}`);
              }
            }
          } catch (error) {
            findings.push({ route: route.path, viewport: viewport.label, check: "l2d-national-attribution", detail: String(error).slice(0, 550) });
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
          // L3 genuine camera controls must never cover navigation or source credits.
          const boxesOverlap = (a: { x: number; y: number; width: number; height: number } | null,
                                b: { x: number; y: number; width: number; height: number } | null): boolean =>
            Boolean(a && b && a.x < b.x + b.width && a.x + a.width > b.x &&
                    a.y < b.y + b.height && a.y + a.height > b.y);
          // Measure real tile-source attribution in both mobile sheet states.
          const assertAttributionUnobscured = async (sheetState: "compact" | "expanded") => {
            const attribution = page.locator(".maplibregl-ctrl-attrib");
            await attribution.waitFor({ state: "visible", timeout: 12_000 });
            if (!(await attribution.innerText()).includes("Esri")) throw new Error("Tile attribution has no provider label");
            const creditBox = await attribution.boundingBox();
            const sheetBox = await page.locator('[data-p4-map-decision-rail]').boundingBox();
            if (!creditBox || !sheetBox ||
                creditBox.x < 0 || creditBox.y < 0 ||
                creditBox.x + creditBox.width > viewport.width + 1 ||
                creditBox.y + creditBox.height > viewport.height + 1 ||
                creditBox.y + creditBox.height > sheetBox.y - 4) {
              throw new Error(`provider credits hidden in ${sheetState} sheet: ${JSON.stringify({ creditBox, sheetBox })}`);
            }
          };
          try {
            if (viewport.width <= 768) {
              await assertAttributionUnobscured("compact");
            } else {
              const attribution = page.locator(".maplibregl-ctrl-attrib");
              await attribution.waitFor({ state: "visible", timeout: 12_000 });
              if (!(await attribution.innerText()).includes("Esri")) throw new Error("Tile attribution has no provider label");
            }
          } catch (error) {
            findings.push({ route: route.path, viewport: viewport.label, check: "l2d-maplibre-attribution", detail: String(error).slice(0, 550) });
          }
          if (route.citySlug === "casablanca" && route.districtSlug === "maarif") {
            try {
              const emptyState = page.locator("[data-p4-map-decision-rail] .p4-premium-empty-evidence");
              await emptyState.waitFor({ state: "visible", timeout: 15_000 });
              const text = await emptyState.innerText();
              if (!text.includes("Aucun repère suffisamment récent n’est actuellement disponible")) {
                throw new Error("Visible Maârif empty-state does not explain source freshness");
              }
            } catch {
              findings.push({ route: route.path, viewport: viewport.label, check: "fresh-poi-empty-state", detail: "Maârif has no sourced recent POIs but empty-state disclosure was not visible" });
            }
          }
          if (route.citySlug === "casablanca" && route.districtSlug === "maarif") {
            // L3-A: genuine north-up 2D default, real street zoom, non-published admin bounds.
            const controls = page.locator("[data-l3-map-modes]");
            const shell = page.locator('[data-l3-maarif-pilot="true"]');
            try {
              await controls.waitFor({ state: "visible", timeout: 12_000 });
              const quartierButtonBox = await controls.locator("[data-l3-go-quarter]").boundingBox();
              const backButtonBox = await page.locator("[data-vivre-ici-territory-back]").boundingBox();
              if (boxesOverlap(quartierButtonBox, backButtonBox)) {
                throw new Error("L3 mode control overlaps return-to-Morocco navigation");
              }
              await page.waitForFunction(() => {
                const map = document.querySelector('[data-l3-maarif-pilot="true"]');
                return map?.getAttribute("data-l3-camera-pitch") === "0"
                  && map?.getAttribute("data-l3-camera-bearing") === "0";
              }, null, { timeout: 12_000 });
              if (viewport.width >= 1024) {
                const mapBox = await page.locator('[data-l3-maarif-pilot="true"] .maplibre-spike-map').boundingBox();
                const marker = page.locator('[data-l3-maarif-pilot="true"] .maplibre-spike-neighborhood-label');
                await marker.waitFor({ state: "visible", timeout: 12_000 });
                const markerBox = await marker.boundingBox();
                if (!mapBox || !markerBox) throw new Error("Maârif focal marker not measurable");
                const normalizedY = (markerBox.y + markerBox.height / 2 - mapBox.y) / mapBox.height;
                if (normalizedY < 0.2 || normalizedY > 0.8) {
                  throw new Error(`Maârif 2D focal marker outside central map area: ${normalizedY.toFixed(3)}`);
                }
              }
              if ((await shell.getAttribute("data-l3-admin-boundary")) !== "unavailable") {
                throw new Error("Unreviewed Maârif administrative bounds must remain unavailable");
              }
              await controls.locator("[data-l3-go-street]").click();
              await page.waitForFunction(() => {
                const map = document.querySelector('[data-l3-maarif-pilot="true"]');
                return map?.getAttribute("data-l3-maarif-view") === "rue"
                  && Number(map?.getAttribute("data-l3-camera-zoom")) >= 16.8;
              }, null, { timeout: 12_000 });
              await page.screenshot({ path: join(outputDir, `map-casablanca-maarif-street-${viewport.label}.png`), fullPage: false });
              screenshotsCaptured += 1;
              await controls.locator("[data-l3-go-quarter]").click();
              await page.waitForFunction(() => {
                const map = document.querySelector('[data-l3-maarif-pilot="true"]');
                return map?.getAttribute("data-l3-maarif-view") === "quartier"
                  && Number(map?.getAttribute("data-l3-camera-zoom")) <= 15.2;
              }, null, { timeout: 12_000 });
            } catch (error) {
              findings.push({ route: route.path, viewport: viewport.label, check: "l3a-maarif-real-camera-modes", detail: String(error).slice(0, 550) });
            }
          }
          if (route.citySlug === "casablanca" && route.districtSlug === "maarif" && viewport.width <= 768) {
            // Real mobile sheet behavior: compact 160px, 44px toggle, visible Search CTA,
            // expanded scrollable context, then collapse again without hiding the CTA.
            const sheet = page.locator('[data-p4-map-decision-rail]');
            const toggle = sheet.locator('.p4-sheet-toggle');
            const cta = sheet.locator('.p4-premium-primary-action');
            try {
              await toggle.waitFor({ state: "visible", timeout: 12_000 });
              const compact = await sheet.boundingBox();
              const toggleBox = await toggle.boundingBox();
              const compactCta = await cta.boundingBox();
              if (!compact || compact.height > 160 || !toggleBox || toggleBox.width < 44 || toggleBox.height < 44 ||
                  !compactCta || compactCta.y + compactCta.height > compact.y + compact.height + 1) {
                throw new Error(`compact dimensions wrong: ${JSON.stringify({ compact, toggleBox, compactCta })}`);
              }
              if ((await toggle.getAttribute('aria-expanded')) !== 'false') throw new Error("collapsed aria-expanded missing");
              await toggle.click();
              await sheet.locator('[data-l2c-extra]').waitFor({ state: "visible", timeout: 12_000 });
              await sheet.locator('[data-l2b-daily-context]').waitFor({ state: "visible", timeout: 12_000 });
              await sheet.locator('[data-l2b-living-context]').waitFor({ state: "visible", timeout: 12_000 });
              if ((await toggle.getAttribute('aria-expanded')) !== 'true') throw new Error("expanded aria-expanded missing");
              await assertAttributionUnobscured("expanded");
              const expanded = await sheet.boundingBox();
              const expandedCta = await cta.boundingBox();
              if (!expanded || expanded.height <= compact.height + 60 || !expandedCta ||
                  expandedCta.y + expandedCta.height > expanded.y + expanded.height + 1) {
                throw new Error(`expanded CTA not visible: ${JSON.stringify({ expanded, expandedCta })}`);
              }
              await page.screenshot({ path: join(outputDir, `map-casablanca-maarif-sheet-expanded-${viewport.label}.png`), fullPage: false });
              screenshotsCaptured += 1;
              await toggle.click();
              if ((await toggle.getAttribute('aria-expanded')) !== 'false') throw new Error("collapsing does not update aria-expanded");
              const recompact = await sheet.boundingBox();
              if (!recompact || recompact.height > 160) throw new Error(`sheet cannot return to compact state: ${recompact?.height}`);
              const noteBox = await page.locator("[data-l3-admin-unavailable]").boundingBox();
              const providerBox = await page.locator(".maplibregl-ctrl-attrib").boundingBox();
              if (boxesOverlap(noteBox, providerBox)) {
                throw new Error(`L3 admin-unavailable disclosure overlaps live source credits: ${JSON.stringify({ noteBox, providerBox })}`);
              }
            } catch (error) {
              findings.push({ route: route.path, viewport: viewport.label, check: "l2c-sheet-expand-collapse", detail: String(error).slice(0, 550) });
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
            await page.locator('[data-premium-map][data-map-level="city"]').waitFor({ state: "visible", timeout: 12_000 });
            const cityDisclosure = page.locator('[data-city-location-notice]');
            await cityDisclosure.waitFor({ state: "visible", timeout: 12_000 });
            await page.getByRole("heading", { name: "Casablanca", exact: true }).waitFor({ state: "visible", timeout: 12_000 });
            // Framer Motion handles map notice and side-rail transition independently.
            // A DOM-visible title/notice alone can still produce a ghosted rail in screenshots.
            await page.waitForFunction(() => {
              const notice = document.querySelector('[data-city-location-notice]');
              const rail = document.querySelector('[data-map-side-panel]');
              const activePanel = rail?.firstElementChild;
              const isCurrentCity = Boolean(rail?.querySelector('[data-selected-quartier="maarif"]'));
              return notice !== null
                && Number.parseFloat(getComputedStyle(notice).opacity) >= 0.98
                && isCurrentCity
                && activePanel !== null
                && Number.parseFloat(getComputedStyle(activePanel).opacity) >= 0.98;
            }, null, { timeout: 15_000 });
            if (!(await cityDisclosure.innerText()).includes("Contours de quartiers indisponibles") ||
                await page.locator('[data-neighborhood-schematic], [data-premium-map] polygon').count() > 0) {
              findings.push({ route: route.path, viewport: viewport.label, check: "l2a-no-fake-geometries", detail: "City view still contains synthetic district polygons or hides its coverage disclaimer" });
            }
            // The initial /map stage remains visible: capture city-mode map BEFORE scrolling
            // down to Maârif in the side panel. This is a distinct 4-viewport L2-A AFTER proof.
            await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
            await page.screenshot({ path: join(outputDir, `map-casablanca-city-${viewport.label}.png`), fullPage: false });
            screenshotsCaptured += 1;
            const maarifButton = page.locator("[data-map-side-panel] button").filter({ hasText: "Maârif" }).first();
            await maarifButton.click({ timeout: 12_000 });
            const selected = page.locator('[data-selected-quartier="maarif"]');
            await selected.waitFor({ state: "visible", timeout: 12_000 });
            const evidence = selected.locator('[data-local-evidence="unavailable"]');
            await evidence.waitFor({ state: "visible", timeout: 12_000 });
            const selectedText = await selected.innerText();
            const allDistrictText = await page.locator("[data-map-side-panel]").innerText();
            if (!selectedText.includes("Aucune statistique non sourcée") ||
                /DH\/m²|repère vérifié|17\s?600|15 repères/i.test(allDistrictText)) {
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
