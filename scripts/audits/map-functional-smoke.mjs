import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3203";
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/map-functional-smoke";
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const diagnostics = { pageErrors: [], requestFailures: [], consoleErrors: [] };
page.on("pageerror", (error) => diagnostics.pageErrors.push(String(error)));
page.on("requestfailed", (request) => diagnostics.requestFailures.push({ url: request.url(), error: request.failure()?.errorText || "unknown" }));
page.on("console", (msg) => { if (msg.type() === "error") diagnostics.consoleErrors.push(msg.text()); });

let result = { ok: false, stage: "init", diagnostics };
try {
  result.stage = "load-map";
  await page.goto(`${baseUrl}/map`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator(".maplibregl-canvas").waitFor({ state: "visible", timeout: 20000 });
  await page.getByText("Chargement de la carte…").waitFor({ state: "hidden", timeout: 20000 });

  result.stage = "select-city";
  await page.getByLabel("Ville").selectOption({ label: "Casablanca" });
  await page.waitForFunction(() => document.querySelectorAll(".maplibre-neighborhood-marker").length > 0, null, { timeout: 20000 });

  result.stage = "click-marker";
  const marker = page.locator(".maplibre-neighborhood-marker").first();
  await marker.click({ timeout: 10000 });
  const panel = page.locator('aside[aria-label^="Fiche repère quartier"]');
  await panel.waitFor({ state: "visible", timeout: 10000 });

  result.stage = "verify-search-link";
  const href = await panel.getByRole("link", { name: /Rechercher dans ce quartier/i }).getAttribute("href");
  if (!href || !href.startsWith("/search") || !/city=/i.test(href)) {
    throw new Error(`Unexpected neighborhood search href: ${href}`);
  }

  await page.screenshot({ path: `${outDir}/map-functional-390x844.png`, fullPage: true });
  result = { ok: true, stage: "complete", href, markerCount: await page.locator(".maplibre-neighborhood-marker").count(), diagnostics };
} catch (error) {
  result.error = error instanceof Error ? error.stack || error.message : String(error);
  await page.screenshot({ path: `${outDir}/failure-390x844.png`, fullPage: true }).catch(() => {});
  throw error;
} finally {
  await writeFile(`${outDir}/report.json`, JSON.stringify(result, null, 2));
  await browser.close();
}
