import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3210";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/announcement-page-l10-finance-maroc");
const route = "/visual-qa/announcement-page-finance-maroc";
const scenarios = [
  { name: "default-390", width: 390, height: 844 },
  { name: "default-430", width: 430, height: 932 },
  { name: "default-768", width: 768, height: 900 },
  { name: "default-1280", width: 1280, height: 900 },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const findings = [];

try {
  for (const scenario of scenarios) {
    const page = await browser.newPage({ viewport: { width: scenario.width, height: scenario.height }, colorScheme: "light", reducedMotion: "reduce" });
    const failedResponses = [];
    const consoleErrors = [];
    const localFindings = [];
    page.on("response", (response) => { if (response.status() >= 400) failedResponses.push({ url: response.url(), status: response.status() }); });
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

    try {
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle", timeout: 60_000 });
      await page.locator("body").waitFor({ state: "visible", timeout: 15_000 });
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

      const section = page.locator('[data-finance-maroc="ann-l10"]');
      if (await section.count() !== 1) localFindings.push("FINANCE_SECTION_MISSING");
      const initialText = await section.evaluate((node) => node.textContent ?? "");
      if (!initialText.includes("Aucun taux bancaire ni frais d’acquisition n’est présumé")) localFindings.push("NO_SILENT_ASSUMPTION_COPY_MISSING");
      if (!initialText.includes("Simulation indicative uniquement")) localFindings.push("DISCLAIMER_MISSING");
      if (!initialText.includes("Renseignez un taux annuel valide")) localFindings.push("EMPTY_RATE_STATE_MISSING");

      await page.getByLabel("Apport en dirhams").fill("400000");
      await page.getByLabel("Taux annuel en pourcentage").fill("4.5");
      await page.getByLabel("Durée en années").fill("20");
      await page.waitForFunction(() => {
        const node = document.querySelector('[data-finance-maroc="ann-l10"]');
        const text = node?.textContent ?? "";
        return text.includes("Mensualité") && text.includes("Intérêts simulés");
      }, null, { timeout: 10_000 });
      const computedText = await section.evaluate((node) => node.textContent ?? "");
      if (!computedText.includes("1 600 000") && !computedText.includes("1 600 000")) localFindings.push("FINANCED_PRINCIPAL_MISSING");
      if (!computedText.includes("Mensualité")) localFindings.push("MONTHLY_PAYMENT_MISSING");
      if (!computedText.includes("Intérêts simulés")) localFindings.push("INTEREST_LABEL_MISSING");

      await page.getByLabel("Taux annuel en pourcentage").fill("0");
      await page.waitForFunction(() => {
        const node = document.querySelector('[data-finance-maroc="ann-l10"]');
        return (node?.textContent ?? "").includes("0 DH");
      }, null, { timeout: 10_000 });
      const zeroRateText = await section.evaluate((node) => node.textContent ?? "");
      if (!zeroRateText.includes("0 DH")) localFindings.push("ZERO_RATE_STATE_MISSING");

      const screenshot = `${scenario.name}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
      results.push({ ...scenario, screenshot, findings: localFindings, failedResponses, consoleErrors, ...metrics });
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
  schemaVersion: "ANNOUNCEMENT_PAGE_L10_FINANCE_MAROC_VISUAL_V1",
  route,
  generatedAt: new Date().toISOString(),
  scenarioCount: scenarios.length,
  screenshotCount: results.filter((item) => item.screenshot).length,
  findingCount: findings.length,
  findings,
  results,
};
await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ scenarioCount: report.scenarioCount, screenshotCount: report.screenshotCount, findingCount: report.findingCount, findings }, null, 2));
if (report.screenshotCount !== scenarios.length) throw new Error(`ANN-L10 capture incomplete: ${report.screenshotCount}/${scenarios.length}`);
if (findings.length > 0) throw new Error(`ANN-L10 visual certification failed with ${findings.length} finding(s)`);
