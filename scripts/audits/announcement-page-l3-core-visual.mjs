import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3204";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/announcement-page-l3-core");
const route = "/visual-qa/announcement-page-core";
const scenarios = [
  { name: "normal-390", state: "normal", width: 390, height: 844, factCount: 4, descriptionToggle: true },
  { name: "normal-430", state: "normal", width: 430, height: 932, factCount: 4 },
  { name: "normal-768", state: "normal", width: 768, height: 900, factCount: 4 },
  { name: "normal-1280", state: "normal", width: 1280, height: 900, factCount: 4 },
  { name: "no-price-390", state: "no-price", width: 390, height: 844, factCount: 4, missingPrice: true },
  { name: "no-price-1280", state: "no-price", width: 1280, height: 900, factCount: 4, missingPrice: true },
  { name: "long-title-390", state: "long-title", width: 390, height: 844, factCount: 4, longTitle: true },
  { name: "long-title-1280", state: "long-title", width: 1280, height: 900, factCount: 4, longTitle: true },
  { name: "sparse-390", state: "sparse", width: 390, height: 844, factCount: 1, sparse: true },
  { name: "dense-1280", state: "dense", width: 1280, height: 900, factCount: 4, dense: true },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const findings = [];

try {
  for (const scenario of scenarios) {
    const page = await browser.newPage({
      viewport: { width: scenario.width, height: scenario.height },
      colorScheme: "light",
      reducedMotion: "reduce",
      hasTouch: scenario.width < 1024,
    });
    const failedResponses = [];
    const consoleErrors = [];
    const localFindings = [];

    page.on("response", (response) => {
      if (response.status() >= 400) failedResponses.push({ url: response.url(), status: response.status() });
    });
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    try {
      const response = await page.goto(`${baseUrl}${route}?state=${scenario.state}`, {
        waitUntil: "networkidle",
        timeout: 60_000,
      });
      await page.locator("body").waitFor({ state: "visible", timeout: 15_000 });

      const media = page.locator("[data-property-media-mode]").first();
      const core = page.locator('[data-announcement-property-core="ann-l3"]');
      const corePrice = page.locator("[data-property-core-price]");
      const coreTitle = page.locator("[data-property-core-title]");
      await media.waitFor({ state: "visible", timeout: 15_000 });
      await core.waitFor({ state: "visible", timeout: 15_000 });

      const metrics = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        h1Count: document.querySelectorAll("h1").length,
        mainCount: document.querySelectorAll("main").length,
      }));
      if ((response?.status() ?? 0) !== 200) localFindings.push(`HTTP_${response?.status() ?? 0}`);
      if (metrics.scrollWidth > metrics.clientWidth + 1) localFindings.push(`OVERFLOW_${metrics.scrollWidth}_${metrics.clientWidth}`);
      if (metrics.h1Count !== 1) localFindings.push(`H1_COUNT_${metrics.h1Count}`);
      if (metrics.mainCount !== 1) localFindings.push(`MAIN_COUNT_${metrics.mainCount}`);
      if (failedResponses.length > 0) localFindings.push(`RESOURCE_HTTP_ERRORS_${failedResponses.length}`);
      if (consoleErrors.length > 0) localFindings.push(`CONSOLE_ERRORS_${consoleErrors.length}`);

      const mediaBox = await media.boundingBox();
      const coreBox = await core.boundingBox();
      if (!mediaBox || !coreBox) {
        localFindings.push("MEDIA_CORE_BOX_MISSING");
      } else {
        const mediaBottom = mediaBox.y + mediaBox.height;
        if (coreBox.y < mediaBottom - 1) localFindings.push(`CORE_OVERLAPS_MEDIA_${Math.round(coreBox.y)}_${Math.round(mediaBottom)}`);
        if (coreBox.y - mediaBottom > 48) localFindings.push(`CORE_TOO_FAR_FROM_MEDIA_${Math.round(coreBox.y - mediaBottom)}`);
      }

      const factCount = await page.locator("[data-property-core-fact]").count();
      if (factCount !== scenario.factCount) localFindings.push(`CORE_FACT_COUNT_${factCount}_EXPECTED_${scenario.factCount}`);

      const priceText = (await corePrice.textContent())?.replace(/\s+/g, " ").trim() ?? "";
      const titleText = (await coreTitle.textContent())?.replace(/\s+/g, " ").trim() ?? "";
      const mediaText = (await media.textContent())?.replace(/\s+/g, " ").trim() ?? "";
      if (priceText && mediaText.includes(priceText)) localFindings.push("PRICE_STILL_INSIDE_MEDIA");
      if (titleText && mediaText.includes(titleText)) localFindings.push("TITLE_STILL_INSIDE_MEDIA");

      const priceState = await core.getAttribute("data-price-state");
      if (scenario.missingPrice) {
        if (priceState !== "missing") localFindings.push(`PRICE_STATE_${priceState}_EXPECTED_missing`);
        if (priceText !== "Prix non communiqué") localFindings.push(`MISSING_PRICE_LABEL_${priceText || "empty"}`);
        if (/\b0\s*DH\b/.test(priceText)) localFindings.push("MISSING_PRICE_RENDERED_AS_ZERO");
      } else if (priceState !== "available") {
        localFindings.push(`PRICE_STATE_${priceState}_EXPECTED_available`);
      }

      const titleBox = await coreTitle.boundingBox();
      if (!titleBox) {
        localFindings.push("TITLE_BOX_MISSING");
      } else if (titleBox.x + titleBox.width > metrics.clientWidth + 1) {
        localFindings.push(`TITLE_OVERFLOW_${Math.round(titleBox.x + titleBox.width)}_${metrics.clientWidth}`);
      }
      if (scenario.longTitle && titleText.length < 120) localFindings.push(`LONG_TITLE_TRUNCATED_${titleText.length}`);

      const provenanceCount = await page.locator("[data-detail-provenance]").count();
      if (provenanceCount === 0) localFindings.push("PROVENANCE_MISSING");

      if (scenario.sparse) {
        const characteristicGroups = await page.locator("[data-property-characteristics-group]").count();
        if (characteristicGroups < 2) localFindings.push(`SPARSE_CHARACTERISTIC_GROUPS_${characteristicGroups}`);
      }
      if (scenario.dense) {
        const detailFactCount = await page.locator("[data-detail-fact]").count();
        if (detailFactCount < 15) localFindings.push(`DENSE_DETAIL_FACT_COUNT_${detailFactCount}`);
      }

      if (scenario.descriptionToggle) {
        const toggle = page.getByRole("button", { name: "Voir plus" });
        await toggle.waitFor({ state: "visible", timeout: 10_000 });
        const toggleBox = await toggle.boundingBox();
        if (!toggleBox || toggleBox.height < 44) localFindings.push(`DESCRIPTION_TOGGLE_LT44_${Math.round(toggleBox?.height ?? 0)}`);
        if ((await toggle.getAttribute("aria-expanded")) !== "false") localFindings.push("DESCRIPTION_INITIAL_ARIA_NOT_FALSE");
        await toggle.click();
        const collapse = page.getByRole("button", { name: "Voir moins" });
        await collapse.waitFor({ state: "visible", timeout: 10_000 });
        if ((await collapse.getAttribute("aria-expanded")) !== "true") localFindings.push("DESCRIPTION_EXPANDED_ARIA_NOT_TRUE");
      }

      const screenshot = `${scenario.name}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
      results.push({
        ...scenario,
        screenshot,
        factCount,
        provenanceCount,
        priceState,
        priceText,
        titleLength: titleText.length,
        failedResponses,
        consoleErrors,
        findings: localFindings,
        ...metrics,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      localFindings.push(`AUDIT_ERROR_${message}`);
      results.push({ ...scenario, error: message, failedResponses, consoleErrors, findings: localFindings });
    } finally {
      findings.push(...localFindings.map((finding) => ({ scenario: scenario.name, finding })));
      await page.close();
    }
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "ANNOUNCEMENT_PAGE_L3_PROPERTY_CORE_VISUAL_V1",
  route,
  generatedAt: new Date().toISOString(),
  scenarioCount: scenarios.length,
  screenshotCount: results.filter((item) => item.screenshot).length,
  findingCount: findings.length,
  findings,
  results,
};
await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  scenarioCount: report.scenarioCount,
  screenshotCount: report.screenshotCount,
  findingCount: report.findingCount,
  findings: report.findings,
}, null, 2));

if (report.screenshotCount !== scenarios.length) throw new Error(`ANN-L3 capture incomplete: ${report.screenshotCount}/${scenarios.length}`);
if (findings.length > 0) throw new Error(`ANN-L3 Property Core certification failed with ${findings.length} finding(s)`);
