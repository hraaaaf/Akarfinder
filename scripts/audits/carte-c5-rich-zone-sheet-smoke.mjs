import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3205";
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-c5-rich-zone-sheet";
await mkdir(outDir, { recursive: true });

const districts = [
  { slug: "agdal", context: true, pageHref: "/quartiers/rabat/agdal" },
  { slug: "hay-riad", context: true, pageHref: "/quartiers/rabat/hay-riad" },
  { slug: "hassan", context: true, pageHref: "/quartiers/rabat/hassan" },
  { slug: "souissi", context: false, pageHref: null },
];
const viewports = [
  { name: "mobile-390", width: 390, height: 844, mobile: true },
  { name: "mobile-430", width: 430, height: 932, mobile: true },
  { name: "desktop", width: 1280, height: 900, mobile: false },
];

function normalizeSlug(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function waitForIntelligence(page, mode, transaction = "sale") {
  const response = await page.waitForResponse((res) => {
    const url = new URL(res.url());
    return url.pathname === "/api/geo/rabat-market-intelligence" &&
      url.searchParams.get("mode") === mode &&
      url.searchParams.get("transaction") === transaction;
  }, { timeout: 30000 });
  if (response.status() !== 200) throw new Error(`C3 API ${mode}/${transaction} returned ${response.status()}`);
  return response.json();
}

async function mobileNavRect(page) {
  const mapLink = page.getByRole("link", { name: "Carte", exact: true }).last();
  if ((await mapLink.count()) === 0) return null;
  return mapLink.evaluate((element) => {
    const nav = element.closest("nav");
    if (!nav) return null;
    const rect = nav.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
  });
}

const report = { ok: false, cases: [], generatedAt: new Date().toISOString() };
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    for (const district of districts) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const diagnostics = { pageErrors: [], requestFailures: [] };
      page.on("pageerror", (error) => diagnostics.pageErrors.push(String(error)));
      page.on("requestfailed", (request) => {
        if (request.url().includes("/api/geo/rabat-market-intelligence")) {
          diagnostics.requestFailures.push({ url: request.url(), error: request.failure()?.errorText || "unknown" });
        }
      });

      const pricePromise = waitForIntelligence(page, "price");
      await page.goto(`${baseUrl}/map?city=rabat&district=${district.slug}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      const pricePayload = await pricePromise;

      const sheet = page.locator("[data-akarfinder-rich-zone-sheet]");
      await sheet.waitFor({ state: "visible", timeout: 20000 });
      await sheet.locator("[data-akarfinder-live-zone-metric]").waitFor({ state: "visible", timeout: 10000 });

      const context = sheet.locator("[data-akarfinder-neighborhood-context]");
      const contextCount = await context.count();
      if (district.context && contextCount !== 1) throw new Error(`${district.slug}: canonical context missing`);
      if (!district.context && contextCount !== 0) throw new Error(`${district.slug}: unexpected invented context`);

      const neighborhoodLink = sheet.getByRole("link", { name: /Voir la fiche quartier/i });
      const neighborhoodLinkCount = await neighborhoodLink.count();
      if (district.pageHref) {
        if (neighborhoodLinkCount !== 1) throw new Error(`${district.slug}: neighborhood page link missing`);
        const href = await neighborhoodLink.getAttribute("href");
        if (href !== district.pageHref) throw new Error(`${district.slug}: unexpected neighborhood href ${href}`);
      } else if (neighborhoodLinkCount !== 0) {
        throw new Error(`${district.slug}: neighborhood link must be omitted`);
      }

      const searchHref = await sheet.getByRole("link", { name: /Rechercher dans cette zone/i }).getAttribute("href");
      if (!searchHref) throw new Error(`${district.slug}: Search CTA missing`);
      const searchUrl = new URL(searchHref, baseUrl);
      if (searchUrl.pathname !== "/search" || normalizeSlug(searchUrl.searchParams.get("city")) !== "rabat" || normalizeSlug(searchUrl.searchParams.get("district")) !== district.slug) {
        throw new Error(`${district.slug}: Search CTA mismatch ${searchHref}`);
      }

      const sheetBox = await sheet.boundingBox();
      if (!sheetBox) throw new Error(`${district.slug}: sheet has no bounding box`);
      if (sheetBox.x < -1 || sheetBox.x + sheetBox.width > viewport.width + 1 || sheetBox.y < -1 || sheetBox.y + sheetBox.height > viewport.height + 1) {
        throw new Error(`${district.slug}/${viewport.name}: sheet escapes viewport ${JSON.stringify(sheetBox)}`);
      }

      if (viewport.mobile) {
        const nav = await mobileNavRect(page);
        if (!nav) throw new Error(`${district.slug}/${viewport.name}: mobile bottom navigation missing`);
        if (sheetBox.y + sheetBox.height > nav.top + 2) {
          throw new Error(`${district.slug}/${viewport.name}: rich sheet overlaps mobile navigation`);
        }
      }

      if (district.slug === "agdal") {
        const densityPromise = waitForIntelligence(page, "density");
        await page.getByRole("tab", { name: "Densité" }).click();
        const densityPayload = await densityPromise;
        if (densityPayload.properties?.mode !== "density") throw new Error("Density payload mismatch");
        await sheet.getByText("Densité", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
        if ((await context.count()) !== 1) throw new Error("Agdal context disappeared after mode switch");
      }

      if (diagnostics.pageErrors.length || diagnostics.requestFailures.length) {
        throw new Error(`${district.slug}/${viewport.name}: browser diagnostics ${JSON.stringify(diagnostics)}`);
      }

      await page.screenshot({
        path: `${outDir}/c5-${district.slug}-${viewport.width}x${viewport.height}.png`,
        fullPage: false,
      });
      report.cases.push({
        viewport: viewport.name,
        district: district.slug,
        contextPresent: contextCount === 1,
        neighborhoodHref: district.pageHref,
        searchHref,
        priceAvailableCount: pricePayload.properties?.legend?.availableCount ?? null,
        diagnostics,
      });
      await page.close();
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
