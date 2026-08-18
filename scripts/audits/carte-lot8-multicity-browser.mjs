import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3205";
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-lot8-multicity";
await mkdir(outDir, { recursive: true });

const cities = [
  { slug: "casablanca", districtSlug: "maarif", city: "Casablanca", district: "Maârif" },
  { slug: "marrakech", districtSlug: "gueliz", city: "Marrakech", district: "Guéliz" },
  { slug: "tanger", districtSlug: "malabata", city: "Tanger", district: "Malabata" },
  { slug: "agadir", districtSlug: "founty", city: "Agadir", district: "Founty" },
  { slug: "fes", districtSlug: "ville-nouvelle", city: "Fès", district: "Ville Nouvelle" },
];
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
];

function basemapTileZoom(url) {
  if (!url.includes("tiles.openfreemap.org")) return null;
  const match = url.match(/\/(\d+)\/\d+\/\d+\.(?:pbf|png)(?:\?|$)/);
  return match ? Number(match[1]) : null;
}

const report = { ok: false, cases: [], generatedAt: new Date().toISOString() };
const browser = await chromium.launch({ headless: true });

try {
  for (const cityCase of cities) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const pageErrors = [];
      const tileResponses = [];
      let highZoomTileCount = 0;
      let tileGateSettled = false;
      let resolveTiles;
      let rejectTiles;
      const tilesReady = new Promise((resolve, reject) => {
        resolveTiles = resolve;
        rejectTiles = reject;
      });
      const tileGateTimeout = setTimeout(() => {
        if (tileGateSettled) return;
        tileGateSettled = true;
        rejectTiles(new Error(`${cityCase.slug}/${viewport.name}: no real high-zoom basemap tiles rendered within 20s`));
      }, 20000);

      page.on("pageerror", (error) => pageErrors.push(String(error)));
      page.on("response", (response) => {
        const zoom = basemapTileZoom(response.url());
        if (zoom === null) return;
        tileResponses.push({ url: response.url(), status: response.status(), zoom });
        if (zoom >= 9 && response.ok()) {
          highZoomTileCount += 1;
          if (highZoomTileCount >= 2 && !tileGateSettled) {
            tileGateSettled = true;
            clearTimeout(tileGateTimeout);
            resolveTiles();
          }
        }
      });

      try {
        await page.goto(`${baseUrl}/map?city=${cityCase.slug}&district=${cityCase.districtSlug}&layer=explore`, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        const loadingCard = page.getByText("Chargement de la carte…", { exact: true });
        await loadingCard.waitFor({ state: "hidden", timeout: 30000 });
        const mapCanvas = page.locator(".maplibregl-canvas");
        await mapCanvas.waitFor({ state: "visible", timeout: 10000 });

        const panel = page.getByRole("complementary", { name: new RegExp(`Fiche repère quartier ${cityCase.district}`, "i") });
        await panel.waitFor({ state: "visible", timeout: 20000 });
        await tilesReady;
        await page.waitForTimeout(450);

        const panelBox = await panel.boundingBox();
        if (!panelBox) throw new Error(`${cityCase.slug}/${viewport.name}: panel has no bounding box`);
        if (panelBox.x < -1 || panelBox.x + panelBox.width > viewport.width + 1 || panelBox.y < -1 || panelBox.y + panelBox.height > viewport.height + 1) {
          throw new Error(`${cityCase.slug}/${viewport.name}: panel escapes viewport ${JSON.stringify(panelBox)}`);
        }

        const searchHref = await panel.getByRole("link", { name: /Rechercher dans ce quartier/i }).getAttribute("href");
        if (!searchHref) throw new Error(`${cityCase.slug}/${viewport.name}: Search handoff missing`);
        const searchUrl = new URL(searchHref, baseUrl);
        if (searchUrl.pathname !== "/search" || searchUrl.searchParams.get("city") !== cityCase.city || searchUrl.searchParams.get("district") !== cityCase.district) {
          throw new Error(`${cityCase.slug}/${viewport.name}: Search handoff mismatch ${searchHref}`);
        }

        if (viewport.width <= 1023) {
          for (const locator of [
            page.getByRole("complementary", { name: "Légende de la carte immobilière" }),
            page.getByRole("navigation", { name: "Exploration territoriale" }),
            page.getByRole("region", { name: "Contrôles de la carte immobilière" }),
          ]) {
            if (await locator.isVisible()) throw new Error(`${cityCase.slug}/${viewport.name}: secondary overlay remains visible`);
          }
          if (panelBox.y + panelBox.height > viewport.height - 76) {
            throw new Error(`${cityCase.slug}/${viewport.name}: panel overlaps bottom navigation ${JSON.stringify(panelBox)}`);
          }
        }

        if (pageErrors.length) throw new Error(`${cityCase.slug}/${viewport.name}: browser page errors ${JSON.stringify(pageErrors)}`);

        await page.screenshot({
          path: `${outDir}/${cityCase.slug}-${cityCase.districtSlug}-${viewport.width}x${viewport.height}.png`,
          fullPage: false,
        });
        report.cases.push({
          city: cityCase.city,
          district: cityCase.district,
          viewport: viewport.name,
          searchHref,
          panelBox,
          mapRendered: true,
          highZoomTileCount,
          tileResponses,
        });
      } finally {
        clearTimeout(tileGateTimeout);
        await page.close();
      }
    }
  }
  report.ok = true;
} catch (error) {
  report.error = error instanceof Error ? error.stack || error.message : String(error);
  throw error;
} finally {
  await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
