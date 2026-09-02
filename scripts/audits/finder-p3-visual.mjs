import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3218";
const phase = process.env.AUDIT_PHASE ?? "after";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/finder-p3-proof");
const route = "/search?guided=1&profile_version=2.0&city=Rabat&profile_cities=Rabat&profile_property_types=Appartement&profile_priorities=family_fit,school_access";
const scenarios = [
  { name: "390", width: 390, height: 844 },
  { name: "1280", width: 1280, height: 900 },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const findings = [];
const results = [];

try {
  for (const scenario of scenarios) {
    const page = await browser.newPage({ viewport: { width: scenario.width, height: scenario.height }, colorScheme: "light", reducedMotion: "reduce" });
    const localFindings = [];
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    try {
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      if ((response?.status() ?? 0) !== 200) localFindings.push(`SEARCH_HTTP_${response?.status() ?? 0}`);
      await page.locator("[data-search-results-section]").waitFor({ state: "visible", timeout: 20_000 });

      const control = page.locator("[data-search-personalization-control]");
      let controlCount = 0;
      if (phase === "after") {
        try {
          await control.waitFor({ state: "visible", timeout: 10_000 });
        } catch {
          // Count below records the exact failure without conflating it with a timeout exception.
        }
        controlCount = await control.count();
        if (controlCount !== 1) localFindings.push(`AFTER_CONTROL_COUNT_${controlCount}`);
        else {
          const toggle = control.getByRole("switch");
          if ((await toggle.getAttribute("aria-checked")) !== "true") localFindings.push("AFTER_PERSONALIZATION_NOT_ACTIVE");
        }
      } else {
        controlCount = await control.count();
        if (controlCount !== 0) localFindings.push("BEFORE_CONTROL_ALREADY_PRESENT");
      }

      const dimensions = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      if (dimensions.scrollWidth > dimensions.innerWidth + 1) localFindings.push(`HORIZONTAL_OVERFLOW_${dimensions.scrollWidth}_${dimensions.innerWidth}`);

      const screenshot = `${phase}-${scenario.name}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: false });

      let disabledScreenshot = null;
      if (phase === "after" && controlCount === 1) {
        const toggle = control.getByRole("switch");
        await Promise.all([
          page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30_000 }),
          toggle.click(),
        ]);
        const disabledControl = page.locator("[data-search-personalization-control]");
        await disabledControl.waitFor({ state: "visible", timeout: 10_000 });
        const disabledToggle = disabledControl.getByRole("switch");
        const currentUrl = new URL(page.url());
        if (currentUrl.searchParams.get("personalized") !== "0") localFindings.push("DISABLE_URL_STATE_MISSING");
        if ((await disabledToggle.getAttribute("aria-checked")) !== "false") localFindings.push("DISABLE_SWITCH_STILL_ACTIVE");
        disabledScreenshot = `after-disabled-${scenario.name}.png`;
        await page.screenshot({ path: path.join(outputDir, disabledScreenshot), fullPage: false });
      }

      if (pageErrors.length > 0) {
        for (const error of pageErrors) localFindings.push(`PAGE_ERROR_${error}`);
      }
      results.push({ ...scenario, screenshot, disabledScreenshot, controlCount, dimensions, pageErrors, findings: localFindings });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      localFindings.push(`AUDIT_ERROR_${message}`);
      results.push({ ...scenario, error: message, pageErrors, findings: localFindings });
    } finally {
      findings.push(...localFindings.map((finding) => ({ scenario: scenario.name, finding })));
      await page.close();
    }
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "FINDER_P3_VISUAL_V3",
  phase,
  route,
  scenarioCount: scenarios.length,
  screenshotCount: results.filter((item) => item.screenshot).length,
  disabledScreenshotCount: results.filter((item) => item.disabledScreenshot).length,
  findingCount: findings.length,
  findings,
  results,
};
await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ phase, screenshotCount: report.screenshotCount, disabledScreenshotCount: report.disabledScreenshotCount, findingCount: report.findingCount, findings }, null, 2));
if (report.screenshotCount !== scenarios.length || report.findingCount > 0) throw new Error(`Finder P3 visual audit failed: ${phase}`);
if (phase === "after" && report.disabledScreenshotCount !== scenarios.length) throw new Error(`Finder P3 disable audit failed: ${report.disabledScreenshotCount}/${scenarios.length}`);
