import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3216";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/mon-projet-p2-visual");
const phase = process.env.AUDIT_PHASE ?? "baseline";
const headSha = process.env.GITHUB_SHA ?? null;

const scenarios = [
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 900 },
  { name: "1280", width: 1280, height: 900 },
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
      if (response.status() >= 400 && !response.url().includes("/api/me/continuity")) {
        failedResponses.push({ url: response.url(), status: response.status() });
      }
    });
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.route("**/api/me/continuity", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "UNAUTHENTICATED_VISUAL_QA" }),
      });
    });

    try {
      const response = await page.goto(`${baseUrl}/mon-projet`, {
        waitUntil: "networkidle",
        timeout: 60_000,
      });
      const wizard = page.locator("[data-p7-mon-projet]");
      await wizard.waitFor({ state: "visible", timeout: 15_000 });

      const metrics = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyHeight: document.body.scrollHeight,
        visibleProgressDesktop: document.querySelectorAll('[data-p7-progress-rail]').length,
        visibleProgressMobile: document.querySelectorAll('[data-p7-progress-mobile]').length,
      }));

      if ((response?.status() ?? 0) !== 200) localFindings.push(`HTTP_${response?.status() ?? 0}`);
      if (metrics.scrollWidth > metrics.clientWidth + 1) localFindings.push(`OVERFLOW_${metrics.scrollWidth}_${metrics.clientWidth}`);
      if (failedResponses.length > 0) localFindings.push(`RESOURCE_HTTP_ERRORS_${failedResponses.length}`);
      if (consoleErrors.length > 0) localFindings.push(`CONSOLE_ERRORS_${consoleErrors.length}`);

      const screenshot = `${phase}-${scenario.name}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
      results.push({
        ...scenario,
        phase,
        screenshot,
        findings: localFindings,
        failedResponses,
        consoleErrors,
        ...metrics,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      localFindings.push(`AUDIT_ERROR_${message}`);
      results.push({ ...scenario, phase, error: message, findings: localFindings, failedResponses, consoleErrors });
    } finally {
      findings.push(...localFindings.map((finding) => ({ scenario: scenario.name, finding })));
      await page.close();
    }
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "MON_PROJET_P2_VISUAL_V1",
  phase,
  headSha,
  generatedAt: new Date().toISOString(),
  route: "/mon-projet",
  scenarioCount: scenarios.length,
  screenshotCount: results.filter((item) => item.screenshot).length,
  findingCount: findings.length,
  findings,
  results,
};

await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  phase: report.phase,
  headSha: report.headSha,
  scenarioCount: report.scenarioCount,
  screenshotCount: report.screenshotCount,
  findingCount: report.findingCount,
  findings,
}, null, 2));

if (report.screenshotCount !== scenarios.length) {
  throw new Error(`MON-PROJET P2 capture incomplete: ${report.screenshotCount}/${scenarios.length}`);
}
