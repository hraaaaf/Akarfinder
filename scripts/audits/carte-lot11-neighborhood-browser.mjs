import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3211";
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-lot11-neighborhood";
await mkdir(outDir, { recursive: true });

const viewports = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "tablet-768", width: 768, height: 900 },
  { name: "desktop-1280", width: 1280, height: 900 },
];

function basemapTileZoom(url) {
  if (!url.includes("tiles.openfreemap.org")) return null;
  const match = url.match(/\/(\d+)\/\d+\/\d+\.(?:pbf|png)(?:\?|$)/);
  return match ? Number(match[1]) : null;
}

async function readMarket(context, city) {
  const response = await context.request.get(
    `${baseUrl}/api/geo/market-intelligence?city=${encodeURIComponent(city)}&mode=listings&transaction=sale`,
  );
  if (response.status() !== 200) {
    throw new Error(`${city}: market API HTTP ${response.status()} ${await response.text()}`);
  }
  return response.json();
}

function expectedListingsLabel(district) {
  if (!district?.runtimeResolved || district.marketMetrics?.listingCount == null) return "Données insuffisantes";
  const count = Math.round(district.marketMetrics.listingCount);
  return `${count.toLocaleString("fr-FR")} annonce${count === 1 ? "" : "s"}`;
}

const report = { ok: false, cases: [], generatedAt: new Date().toISOString() };
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const casaPayload = await readMarket(context, "casablanca");
    const fesPayload = await readMarket(context, "fes");
    const maarif = casaPayload.districts?.find((district) => district.districtSlug === "maarif");
    const fes = fesPayload.districts?.find((district) => district.districtSlug === "ville-nouvelle");
    if (!maarif) throw new Error(`${viewport.name}: Maârif market row missing`);
    if (!fes) throw new Error(`${viewport.name}: Fès Ville Nouvelle market row missing`);

    for (const target of [
      { key: "casablanca-maarif", path: "/quartiers/casablanca/maarif", district: maarif },
      { key: "fes-ville-nouvelle", path: "/quartiers/fes/ville-nouvelle", district: fes },
    ]) {
      const page = await context.newPage();
      const pageErrors = [];
      const tileResponses = [];
      let highZoomTileCount = 0;
      let tileGateSettled = false;
      let resolveTileGate;
      let rejectTileGate;
      const realTilesReady = new Promise((resolve, reject) => {
        resolveTileGate = resolve;
        rejectTileGate = reject;
      });
      const tileGateTimeout = setTimeout(() => {
        if (tileGateSettled) return;
        tileGateSettled = true;
        rejectTileGate(new Error(`${viewport.name}/${target.key}: fewer than two successful real OpenFreeMap high-zoom tiles within 20s`));
      }, 20_000);

      page.on("pageerror", (error) => pageErrors.push(String(error)));
      page.on("console", (message) => {
        if (message.type() === "error") pageErrors.push(message.text());
      });
      page.on("response", (response) => {
        const zoom = basemapTileZoom(response.url());
        if (zoom == null) return;
        tileResponses.push({ url: response.url(), status: response.status(), zoom });
        if (zoom >= 9 && response.ok()) {
          highZoomTileCount += 1;
          if (highZoomTileCount >= 2 && !tileGateSettled) {
            tileGateSettled = true;
            clearTimeout(tileGateTimeout);
            resolveTileGate();
          }
        }
      });

      try {
        const response = await page.goto(`${baseUrl}${target.path}`, {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });
        if (!response || response.status() !== 200) {
          throw new Error(`${viewport.name}/${target.key}: page HTTP ${response?.status()}`);
        }

        const kpis = page.locator("[data-akarfinder-neighborhood-market-kpis]");
        await kpis.waitFor({ state: "visible", timeout: 15_000 });
        await page.locator("[data-akarfinder-neighborhood-data-quality]").waitFor({ state: "visible", timeout: 10_000 });
        await page.locator("[data-akarfinder-neighborhood-dominant-categories]").waitFor({ state: "visible", timeout: 10_000 });

        const mapPreview = page.locator("[data-akarfinder-neighborhood-map-preview]");
        await mapPreview.waitFor({ state: "visible", timeout: 15_000 });
        await mapPreview.locator(".maplibregl-canvas").waitFor({ state: "visible", timeout: 15_000 });
        await page.waitForFunction(
          () => document.querySelector("[data-akarfinder-neighborhood-map-preview]")?.getAttribute("data-map-ready") === "true",
          null,
          { timeout: 20_000 },
        );
        await realTilesReady;
        await page.locator("[data-akarfinder-neighborhood-back]").waitFor({ state: "visible", timeout: 10_000 });
        await page.locator("[data-akarfinder-neighborhood-share]").waitFor({ state: "visible", timeout: 10_000 });

        const pageText = await page.locator("main").innerText();
        const expectedListings = expectedListingsLabel(target.district);
        if (!pageText.includes(expectedListings)) {
          throw new Error(`${viewport.name}/${target.key}: listings truth mismatch expected=${expectedListings}`);
        }
        if (!pageText.includes("Historique insuffisant")) {
          throw new Error(`${viewport.name}/${target.key}: trend must remain fail-closed`);
        }
        if (!pageText.includes("Données insuffisantes pour une classification certifiée")) {
          throw new Error(`${viewport.name}/${target.key}: dominant categories must remain fail-closed`);
        }

        const searchLink = page.getByRole("link", { name: "Rechercher dans ce quartier" });
        await searchLink.waitFor({ state: "visible", timeout: 10_000 });
        const searchHref = await searchLink.getAttribute("href");
        const searchUrl = new URL(searchHref || "", baseUrl);
        if (searchUrl.pathname !== "/search") {
          throw new Error(`${viewport.name}/${target.key}: invalid Search handoff ${searchHref}`);
        }

        const mapLink = page.getByRole("link", { name: "Voir sur la carte" });
        const mapHref = await mapLink.getAttribute("href");
        const mapUrl = new URL(mapHref || "", baseUrl);
        const expectedCity = target.key.startsWith("casablanca-") ? "casablanca" : "fes";
        const expectedDistrict = target.key === "casablanca-maarif" ? "maarif" : "ville-nouvelle";
        if (
          mapUrl.pathname !== "/map" ||
          mapUrl.searchParams.get("city") !== expectedCity ||
          mapUrl.searchParams.get("district") !== expectedDistrict ||
          mapUrl.searchParams.get("layer") !== "listings"
        ) {
          throw new Error(`${viewport.name}/${target.key}: invalid Map handoff ${mapHref}`);
        }

        const previewMapHref = await mapPreview.getByRole("link", { name: "Ouvrir la carte" }).getAttribute("href");
        if (previewMapHref !== mapHref) {
          throw new Error(`${viewport.name}/${target.key}: map preview handoff mismatch ${previewMapHref}`);
        }

        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        if (overflow.scrollWidth > overflow.clientWidth + 2) {
          throw new Error(`${viewport.name}/${target.key}: horizontal overflow ${JSON.stringify(overflow)}`);
        }

        let bottomNavClearance = null;
        if (viewport.width < 768) {
          const mobileNav = page.getByRole("navigation", { name: "Navigation mobile" });
          await mobileNav.waitFor({ state: "visible", timeout: 10_000 });
          await searchLink.scrollIntoViewIfNeeded();
          const [searchBox, navBox] = await Promise.all([searchLink.boundingBox(), mobileNav.boundingBox()]);
          if (!searchBox || !navBox) {
            throw new Error(`${viewport.name}/${target.key}: cannot measure CTA / bottom-nav clearance`);
          }
          bottomNavClearance = navBox.y - (searchBox.y + searchBox.height);
          if (bottomNavClearance < 8) {
            throw new Error(`${viewport.name}/${target.key}: primary CTA is obscured by mobile bottom nav, clearance=${bottomNavClearance}`);
          }
        }

        await page.evaluate(() => {
          document.documentElement.style.scrollBehavior = "auto";
          document.body.style.scrollBehavior = "auto";
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
          if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
        });
        await page.waitForFunction(() => Math.abs(window.scrollY) <= 1, null, { timeout: 5_000 });

        await page.screenshot({
          path: `${outDir}/${target.key}-${viewport.width}x${viewport.height}.png`,
          fullPage: false,
        });

        if (pageErrors.length) {
          throw new Error(`${viewport.name}/${target.key}: page errors ${JSON.stringify(pageErrors)}`);
        }

        report.cases.push({
          viewport: viewport.name,
          target: target.key,
          runtimeResolved: target.district.runtimeResolved,
          listingCount: target.district.marketMetrics?.listingCount ?? null,
          priceMedianMadM2: target.district.marketMetrics?.priceMedianMadM2 ?? null,
          densityKm2: target.district.marketMetrics?.listingDensityKm2 ?? null,
          freshnessStatus: target.district.freshnessStatus,
          searchHref,
          mapHref,
          previewMapHref,
          mapPreview: true,
          actionsReady: true,
          highZoomTileCount,
          tileResponses: tileResponses.slice(-12),
          overflow,
          bottomNavClearance,
        });
      } finally {
        if (!tileGateSettled) clearTimeout(tileGateTimeout);
        await page.close();
      }
    }

    await context.close();
  }

  report.ok = true;
} catch (error) {
  report.error = error instanceof Error ? error.stack || error.message : String(error);
  throw error;
} finally {
  await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
