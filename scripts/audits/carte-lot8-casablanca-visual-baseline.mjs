import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3205";
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-lot8-casablanca-baseline";
await mkdir(outDir, { recursive: true });

const viewports = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "tablet", width: 768, height: 900 },
  { name: "desktop", width: 1280, height: 900 },
];

const report = { ok: false, cases: [], findings: [], generatedAt: new Date().toISOString() };
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const diagnostics = { pageErrors: [], requestFailures: [] };
    page.on("pageerror", (error) => diagnostics.pageErrors.push(String(error)));
    page.on("requestfailed", (request) => diagnostics.requestFailures.push({
      url: request.url(),
      error: request.failure()?.errorText || "unknown",
    }));

    await page.goto(`${baseUrl}/map?city=casablanca&district=anfa&layer=explore`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const controls = page.getByRole("region", { name: "Contrôles de la carte immobilière" });
    await controls.waitFor({ state: "visible", timeout: 20000 });

    const citySelect = controls.locator("select");
    if ((await citySelect.inputValue()) !== "Casablanca") {
      throw new Error(`${viewport.name}: Casablanca city selection missing`);
    }

    const searchLink = controls.getByRole("link", { name: /Rechercher cette zone|Résultats/i });
    const searchHref = await searchLink.getAttribute("href");
    if (!searchHref) throw new Error(`${viewport.name}: Search handoff missing`);
    const searchUrl = new URL(searchHref, baseUrl);
    const searchCity = searchUrl.searchParams.get("city");
    const searchDistrict = searchUrl.searchParams.get("district");
    if (searchUrl.pathname !== "/search" || searchCity !== "Casablanca" || searchDistrict !== "Anfa") {
      report.findings.push({
        viewport: viewport.name,
        type: "search-handoff-baseline",
        expected: "/search?city=Casablanca&district=Anfa",
        actual: searchHref,
      });
    }

    const panel = page.getByRole("complementary", { name: /Fiche repère quartier Anfa/i });
    await panel.waitFor({ state: "visible", timeout: 15000 });
    const panelBox = await panel.boundingBox();
    if (!panelBox) throw new Error(`${viewport.name}: Anfa panel has no bounding box`);
    if (panelBox.x < -1 || panelBox.x + panelBox.width > viewport.width + 1 || panelBox.y < -1 || panelBox.y + panelBox.height > viewport.height + 1) {
      throw new Error(`${viewport.name}: Anfa panel escapes viewport ${JSON.stringify(panelBox)}`);
    }

    if (diagnostics.pageErrors.length) {
      throw new Error(`${viewport.name}: browser page errors ${JSON.stringify(diagnostics.pageErrors)}`);
    }

    await page.screenshot({
      path: `${outDir}/casablanca-anfa-${viewport.width}x${viewport.height}.png`,
      fullPage: false,
    });

    report.cases.push({
      viewport: viewport.name,
      searchHref,
      panelBox,
      diagnostics,
    });
    await page.close();
  }
  report.ok = true;
} catch (error) {
  report.error = error instanceof Error ? error.stack || error.message : String(error);
  throw error;
} finally {
  await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
