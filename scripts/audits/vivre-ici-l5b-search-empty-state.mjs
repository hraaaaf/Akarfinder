import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3213";
const outDir = process.env.L5B_AUDIT_OUTPUT_DIR || "data/audits/carte-national-journey-n3/l5b";
await mkdir(outDir, { recursive: true });

const viewports = [
  { name: "390", width: 390, height: 844, mobile: true },
  { name: "430", width: 430, height: 932, mobile: true },
  { name: "768", width: 768, height: 900, mobile: false },
  { name: "1280", width: 1280, height: 900, mobile: false },
];
const report = { ok: false, gatewayContract: null, cases: [], failure: null };
const emptyLegacyResponse = {
  listings: [], total: 0, limit: 24, offset: 0, next_cursor: null,
  has_more: false, source: "controlled_audit_fixture",
};
const emptyGatewayResponse = {
  ok: true, degraded: false, reason: "district_requires_structured_search",
  sources_queried: [], results_count: 0, total_count: 0,
  has_more: false, next_cursor: null, results: [],
};
const scopedSearchUrl = baseUrl + "/search?city=Casablanca&district=Ma%C3%A2rif";

const gatewayResponse = await fetch(baseUrl + "/api/search/gateway?city=Casablanca&district=Ma%C3%A2rif");
if (!gatewayResponse.ok) throw new Error("district gateway HTTP " + gatewayResponse.status);
const gatewayPayload = await gatewayResponse.json();
if (gatewayPayload.reason !== "district_requires_structured_search" ||
    gatewayPayload.results_count !== 0 || gatewayPayload.total_count !== 0 ||
    gatewayPayload.results?.length !== 0 || gatewayPayload.sources_queried?.length !== 0) {
  throw new Error("district gateway widened search: " + JSON.stringify(gatewayPayload));
}
report.gatewayContract = { reason: gatewayPayload.reason, resultCount: 0, sourceCount: 0 };

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.mobile, hasTouch: viewport.mobile, deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const pageErrors = [];
    const scopedRequests = [];
    page.on("pageerror", error => pageErrors.push(String(error)));
    try {
      // Browser-only fixtures: never write to the database or invent listing cards.
      await page.route(/\/api\/search(?:\?|$)/, async route => {
        const url = new URL(route.request().url());
        if (url.searchParams.get("city") === "Casablanca" &&
            url.searchParams.get("district") === "Maârif") scopedRequests.push(url.toString());
        await route.fulfill({
          status: 200, contentType: "application/json",
          body: JSON.stringify(emptyLegacyResponse),
        });
      });
      await page.route(/\/api\/search\/gateway(?:\?|$)/, async route => {
        await route.fulfill({
          status: 200, contentType: "application/json",
          body: JSON.stringify(emptyGatewayResponse),
        });
      });
      await page.goto(scopedSearchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      const results = page.locator("[data-search-results-section]");
      await results.waitFor({ state: "visible", timeout: 30000 });
      await page.waitForFunction(() => {
        const section = document.querySelector("[data-search-results-section]");
        const toolbar = document.querySelector("[data-search-results-toolbar]");
        return Boolean(section && toolbar &&
          !toolbar.querySelector(".animate-spin") &&
          !section.querySelector(".animate-pulse") &&
          section.querySelector("h1")?.textContent?.includes("0 résultat"));
      }, null, { timeout: 30000 });
      const city = page.locator('[data-search-active-filter="city"]');
      const district = page.locator('[data-search-active-filter="district"]');
      await city.waitFor({ state: "visible", timeout: 10000 });
      await district.waitFor({ state: "visible", timeout: 10000 });
      if (!(await city.innerText()).includes("Casablanca") ||
          !(await district.innerText()).includes("Maârif")) {
        throw new Error("canonical Search filters missing on zero-result state");
      }
      await page.getByText("Aucun résultat pour ces critères").waitFor({ state: "visible", timeout: 10000 });
      const propertyCards = await page.locator("[data-search-primary-card]").count();
      if (propertyCards !== 0) throw new Error("fixture exposed invented property cards: " + propertyCards);
      if (scopedRequests.length < 1) throw new Error("scoped /api/search request never executed");
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) throw new Error("search overflow " + viewport.name + ": " + overflow);
      await page.screenshot({ path: outDir + "/empty-maarif-" + viewport.name + ".png", fullPage: false });
      if (pageErrors.length) throw new Error("initial Search hydration/page errors: " + JSON.stringify(pageErrors));

      await page.getByRole("button", { name: "Élargir la recherche" }).click();
      await page.waitForURL(url => url.pathname === "/search" &&
        !url.searchParams.has("city") && !url.searchParams.has("district"), { timeout: 10000 });
      if (await page.locator('[data-search-active-filter="city"],[data-search-active-filter="district"]').count()) {
        throw new Error("geo filter chips still active after deliberate reset");
      }
      await page.screenshot({ path: outDir + "/reset-maarif-" + viewport.name + ".png", fullPage: false });
      if (pageErrors.length) throw new Error("browser page errors: " + JSON.stringify(pageErrors));
      report.cases.push({
        viewport: viewport.name, scopedRequests: scopedRequests.length,
        propertyCards, emptyState: true, resetClearsGeo: true, overflow,
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
  await writeFile(outDir + "/report.json", JSON.stringify(report, null, 2));
}
