import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3216";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/p1-home-before");
const expectedH1 = "1er moteur de recherche immobilier au Maroc";

const scenarios = [
  { name: "home-before-390", width: 390, height: 844 },
  { name: "home-before-768", width: 768, height: 1024 },
  { name: "home-before-1280", width: 1280, height: 900 },
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
    });

    const localFindings = [];
    const failedResponses = [];
    const consoleErrors = [];

    page.on("response", (response) => {
      if (response.status() >= 400) failedResponses.push({ url: response.url(), status: response.status() });
    });
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    try {
      const response = await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60_000 });
      await page.locator("body").waitFor({ state: "visible", timeout: 15_000 });
      await page.getByRole("heading", { level: 1, name: expectedH1 }).waitFor({ state: "visible", timeout: 15_000 });
      await page.locator('[data-home-listings="hvr-3"]').waitFor({ state: "visible", timeout: 15_000 });
      await page.evaluate(() => document.fonts.ready);

      const metrics = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        h1Count: document.querySelectorAll("h1").length,
        mainCount: document.querySelectorAll("main").length,
        bodyHeight: document.body.scrollHeight,
      }));

      if ((response?.status() ?? 0) !== 200) localFindings.push(`HTTP_${response?.status() ?? 0}`);
      if (metrics.scrollWidth > metrics.clientWidth + 1) localFindings.push(`OVERFLOW_${metrics.scrollWidth}_${metrics.clientWidth}`);
      if (metrics.h1Count !== 1) localFindings.push(`H1_COUNT_${metrics.h1Count}`);
      if (metrics.mainCount !== 1) localFindings.push(`MAIN_COUNT_${metrics.mainCount}`);

      const h1 = (await page.locator("h1").first().innerText()).trim();
      if (h1 !== expectedH1) localFindings.push(`H1_DRIFT_${h1}`);

      const screenshot = `${scenario.name}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });

      results.push({
        ...scenario,
        screenshot,
        h1,
        findings: localFindings,
        failedResponses,
        consoleErrors,
        ...metrics,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      localFindings.push(`AUDIT_ERROR_${message}`);
      results.push({ ...scenario, error: message, findings: localFindings, failedResponses, consoleErrors });
    } finally {
      findings.push(...localFindings.map((finding) => ({ scenario: scenario.name, finding })));
      await page.close();
    }
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "AKARFINDER_P1_HOME_BEFORE_V1",
  generatedAt: new Date().toISOString(),
  gitSha: process.env.GITHUB_SHA ?? null,
  deterministicMode: process.env.HVR3_CERTIFICATION_MODE === "true",
  scenarioCount: scenarios.length,
  screenshotCount: results.filter((item) => item.screenshot).length,
  findingCount: findings.length,
  findings,
  results,
};

await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  schemaVersion: report.schemaVersion,
  gitSha: report.gitSha,
  deterministicMode: report.deterministicMode,
  screenshotCount: report.screenshotCount,
  findingCount: report.findingCount,
  findings,
}, null, 2));

if (report.screenshotCount !== scenarios.length) {
  throw new Error(`P1 HOME BEFORE capture incomplete: ${report.screenshotCount}/${scenarios.length}`);
}
if (findings.length > 0) {
  throw new Error(`P1 HOME BEFORE visual baseline failed with ${findings.length} finding(s)`);
}
