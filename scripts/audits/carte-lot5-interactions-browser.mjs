import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3205";
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-lot5-interactions";
await mkdir(outDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForMarketResponse(page, mode, transaction) {
  const response = await page.waitForResponse((res) => {
    const url = new URL(res.url());
    return url.pathname === "/api/geo/rabat-market-intelligence"
      && url.searchParams.get("mode") === mode
      && url.searchParams.get("transaction") === transaction;
  }, { timeout: 30000 });
  assert(response.status() === 200, `${mode}/${transaction}: API ${response.status()}`);
  return response.json();
}

async function expectUrl(page, predicate, label) {
  await page.waitForURL((url) => predicate(url), { timeout: 15000 });
  const url = new URL(page.url());
  assert(predicate(url), `${label}: unexpected URL ${url.href}`);
  return url;
}

const report = { ok: false, cases: [], generatedAt: new Date().toISOString() };
const browser = await chromium.launch({ headless: true });

try {
  // Desktop interaction contract.
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const startPath = "/map?city=rabat&district=agdal&layer=explore&min_price=1000000&bedrooms=3";
    const pricePromise = waitForMarketResponse(page, "price", "sale");
    await page.goto(`${baseUrl}${startPath}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await pricePromise;

    const sheet = page.locator("[data-akarfinder-rich-zone-sheet]");
    await sheet.waitFor({ state: "visible", timeout: 20000 });
    assert((await sheet.getByRole("heading", { name: "Agdal" }).count()) === 1, "Agdal sheet mismatch");

    const initialUrl = new URL(page.url());
    assert(initialUrl.searchParams.get("city") === "rabat", "initial city must be rabat");
    assert(initialUrl.searchParams.get("district") === "agdal", "initial district must be agdal");
    assert(initialUrl.searchParams.get("layer") === "explore", "canonical layer missing");

    const searchHref = await sheet.getByRole("link", { name: /Rechercher dans cette zone/i }).getAttribute("href");
    assert(searchHref, "Search CTA missing");
    const searchUrl = new URL(searchHref, baseUrl);
    assert(searchUrl.pathname === "/search", `Search path mismatch ${searchHref}`);
    assert(searchUrl.searchParams.get("city") === "Rabat", `Search city mismatch ${searchHref}`);
    assert(searchUrl.searchParams.get("district") === "Agdal", `Search district mismatch ${searchHref}`);
    assert(searchUrl.searchParams.get("min_price") === "1000000", "Search min_price context lost");
    assert(searchUrl.searchParams.get("bedrooms") === "3", "Search bedrooms context lost");

    // Mode changes preserve selected district.
    for (const mode of ["density", "listings", "price"]) {
      const apiMode = mode;
      const responsePromise = waitForMarketResponse(page, apiMode, "sale");
      const tab = page.locator(`[data-akarfinder-intelligence-mode="${mode}"]`);
      await tab.click();
      await responsePromise;
      await page.getByText(mode === "density" ? "Vue Densité" : mode === "listings" ? "Vue Annonces" : "Vue Prix", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
      const url = new URL(page.url());
      assert(url.searchParams.get("district") === "agdal", `${mode}: district lost`);
      assert((await sheet.count()) === 1, `${mode}: sheet disappeared`);
    }

    // Transaction changes API + Search handoff but preserves location.
    const rentPromise = waitForMarketResponse(page, "price", "rent");
    await page.getByRole("button", { name: "Location", exact: true }).click();
    await rentPromise;
    const rentHref = await sheet.getByRole("link", { name: /Rechercher dans cette zone/i }).getAttribute("href");
    const rentSearch = new URL(rentHref, baseUrl);
    assert(rentSearch.searchParams.get("transaction_type") === "rent", `rent Search handoff mismatch ${rentHref}`);
    assert(rentSearch.searchParams.get("city") === "Rabat", "rent city lost");
    assert(rentSearch.searchParams.get("district") === "Agdal", "rent district lost");
    assert(new URL(page.url()).searchParams.get("district") === "agdal", "rent switch changed map district");

    // Close restores city state and canonical URL.
    await sheet.getByRole("button", { name: "Fermer la zone" }).click();
    const closedUrl = await expectUrl(page, (url) => url.searchParams.get("city") === "rabat" && !url.searchParams.has("district") && url.searchParams.get("layer") === "explore", "close zone");
    assert(closedUrl.searchParams.get("min_price") === "1000000", "close lost min_price context");
    await sheet.waitFor({ state: "hidden", timeout: 10000 });

    // Six-city selector navigation contract: switching city removes Rabat district state.
    const casablanca = page.getByRole("button", { name: "Casablanca", exact: true });
    await casablanca.click();
    await expectUrl(page, (url) => url.searchParams.get("city") === "casablanca" && !url.searchParams.has("district"), "city switch Casablanca");

    report.cases.push({ name: "desktop-core-interactions", ok: true });
    await page.close();
  }

  // Mobile sheet closure must restore cockpit access.
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const pricePromise = waitForMarketResponse(page, "price", "sale");
    await page.goto(`${baseUrl}/map?city=rabat&district=agdal&layer=explore`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await pricePromise;
    const sheet = page.locator("[data-akarfinder-rich-zone-sheet]");
    const cockpit = page.locator("[data-akarfinder-premium-map-toolbar]");
    await sheet.waitFor({ state: "visible", timeout: 20000 });
    assert(!(await cockpit.isVisible()), "mobile cockpit must hide while sheet is open");
    await sheet.getByRole("button", { name: "Fermer la zone" }).click();
    await sheet.waitFor({ state: "hidden", timeout: 10000 });
    await cockpit.waitFor({ state: "visible", timeout: 10000 });
    await expectUrl(page, (url) => url.searchParams.get("city") === "rabat" && !url.searchParams.has("district"), "mobile close zone");
    report.cases.push({ name: "mobile-close-restores-cockpit", ok: true });
    await page.close();
  }

  // Loading state: delay the real endpoint, assert explicit loading UI, then allow success.
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.route("**/api/geo/rabat-market-intelligence?*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await route.continue();
    });
    const navigation = page.goto(`${baseUrl}/map?city=rabat&layer=explore`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.getByText("Chargement de la carte des quartiers…", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
    await navigation;
    await page.getByText("Chargement de la carte des quartiers…", { exact: true }).waitFor({ state: "hidden", timeout: 20000 });
    report.cases.push({ name: "loading-state", ok: true });
    await page.close();
  }

  // Fail-closed state: force API 503, assert explicit error and absence of invented analytical UI.
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.route("**/api/geo/rabat-market-intelligence?*", async (route) => {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "forced-lot5-certification" }) });
    });
    await page.goto(`${baseUrl}/map?city=rabat&district=agdal&layer=explore`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.getByText("Données quartiers temporairement indisponibles", { exact: true }).waitFor({ state: "visible", timeout: 15000 });
    assert((await page.locator("[data-akarfinder-intelligence-legend]").count()) === 0, "fail-closed must not show legend");
    assert((await page.locator("[data-akarfinder-rich-zone-sheet]").count()) === 0, "fail-closed must not show zone sheet");
    await page.getByText(/Aucune couleur de remplacement n’est inventée/i).waitFor({ state: "visible", timeout: 10000 });
    report.cases.push({ name: "fail-closed-state", ok: true });
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
