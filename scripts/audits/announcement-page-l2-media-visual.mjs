import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3203";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/announcement-page-l2-media");
const route = "/visual-qa/announcement-page-media";
const scenarios = [
  { name: "gallery-390", state: "gallery", width: 390, height: 844, expectedMode: "gallery", interaction: true },
  { name: "gallery-430", state: "gallery", width: 430, height: 932, expectedMode: "gallery" },
  { name: "gallery-768", state: "gallery", width: 768, height: 900, expectedMode: "gallery" },
  { name: "gallery-1280", state: "gallery", width: 1280, height: 900, expectedMode: "gallery" },
  { name: "preview-390", state: "preview", width: 390, height: 844, expectedMode: "single_real" },
  { name: "forbidden-390", state: "forbidden", width: 390, height: 844, expectedMode: "fallback" },
  { name: "unknown-390", state: "unknown", width: 390, height: 844, expectedMode: "fallback" },
  { name: "broken-390", state: "broken", width: 390, height: 844, expectedMode: "fallback", allowBrokenAsset: true },
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

    page.on("response", (response) => {
      if (response.status() >= 400) failedResponses.push({ url: response.url(), status: response.status() });
    });
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    const localFindings = [];
    try {
      const response = await page.goto(`${baseUrl}${route}?state=${scenario.state}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page.locator("body").waitFor({ state: "visible", timeout: 15_000 });
      await page.waitForTimeout(scenario.allowBrokenAsset ? 1200 : 500);

      const media = page.locator("[data-property-media-mode]").first();
      await media.waitFor({ state: "visible", timeout: 15_000 });
      const mode = await media.getAttribute("data-property-media-mode");
      if (mode !== scenario.expectedMode) localFindings.push(`MEDIA_MODE_${mode}_EXPECTED_${scenario.expectedMode}`);

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

      if (scenario.state === "gallery") {
        const expectedCount = scenario.width >= 1024 ? "Voir les 4 photos" : "Ouvrir les 4 photos en plein écran";
        const openGallery = page.getByRole("button", { name: new RegExp(expectedCount) }).first();
        await openGallery.waitFor({ state: "visible", timeout: 10_000 });
        const box = await openGallery.boundingBox();
        if (!box || box.height < 44) localFindings.push(`GALLERY_TRIGGER_LT44_${Math.round(box?.height ?? 0)}`);

        if (scenario.interaction) {
          await openGallery.click();
          const dialog = page.getByRole("dialog", { name: /Galerie photos de/ });
          await dialog.waitFor({ state: "visible", timeout: 10_000 });
          await page.keyboard.press("ArrowRight");
          await page.waitForTimeout(100);
          const counter = await dialog.locator("p").first().textContent();
          if (!counter?.includes("2 / 4")) localFindings.push(`KEYBOARD_NEXT_FAILED_${counter ?? "missing"}`);
          await page.keyboard.press("Escape");
          if (await dialog.isVisible().catch(() => false)) localFindings.push("ESCAPE_CLOSE_FAILED");
        }
      } else {
        const galleryButtons = await page.getByRole("button", { name: /Ouvrir les .*photos|Voir les .*photos/ }).count();
        if (galleryButtons > 0) localFindings.push(`UNEXPECTED_GALLERY_TRIGGER_${galleryButtons}`);
      }

      if (scenario.allowBrokenAsset) {
        const unexpected = failedResponses.filter((item) => !item.url.includes("does-not-exist.jpg"));
        if (unexpected.length > 0) localFindings.push(`UNEXPECTED_HTTP_ERRORS_${unexpected.length}`);
      } else if (failedResponses.length > 0) {
        localFindings.push(`RESOURCE_HTTP_ERRORS_${failedResponses.length}`);
      }
      if (!scenario.allowBrokenAsset && consoleErrors.length > 0) localFindings.push(`CONSOLE_ERRORS_${consoleErrors.length}`);

      const screenshot = `${scenario.name}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
      results.push({ ...scenario, mode, screenshot, failedResponses, consoleErrors, findings: localFindings, ...metrics });
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
  schemaVersion: "ANNOUNCEMENT_PAGE_L2_MEDIA_VISUAL_V1",
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

if (report.screenshotCount !== scenarios.length) throw new Error(`ANN-L2 capture incomplete: ${report.screenshotCount}/${scenarios.length}`);
if (findings.length > 0) throw new Error(`ANN-L2 media certification failed with ${findings.length} finding(s)`);
