import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3210";
const outputDir = process.env.AUDIT_OUTPUT_DIR ?? "data/audits/partner-pages-deep";

const scenarios = [
  { name: "agency-acquisition", url: "/pro/agences", expectedText: "Transformez un portefeuille" },
  { name: "promoter-acquisition", url: "/promoteurs", expectedText: "Structurez vos projets" },
  { name: "agency-showcase", url: "/demo/agence", expectedText: "Rabat Select Immobilier", expectNoIndex: true },
  { name: "promoter-showcase", url: "/demo/promoteur", expectedText: "Atlas Résidences", expectNoIndex: true },
  {
    name: "agency-public-preview",
    url: "/professionnels/agence-demo-akarfinder?preview=demo",
    expectedText: "Agence Démo AkarFinder",
    expectedSecondaryText: "Aucune agence réelle n’est représentée",
    expectNoIndex: true,
  },
  {
    name: "promoter-public-preview",
    url: "/promoteurs/promoteur-demo-akarfinder?preview=demo",
    expectedText: "Promoteur Démo AkarFinder",
    expectedSecondaryText: "Promoteur partenaire",
    expectNoIndex: true,
  },
];

const viewports = [
  ["390x844", 390, 844],
  ["430x932", 430, 932],
  ["768x900", 768, 900],
  ["1280x900", 1280, 900],
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const findings = [];

try {
  for (const scenario of scenarios) {
    for (const [viewport, width, height] of viewports) {
      const page = await browser.newPage({ viewport: { width, height }, colorScheme: "light" });
      const consoleErrors = [];
      const responseErrors = [];

      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("response", (response) => {
        if (response.status() >= 400) responseErrors.push({ url: response.url(), status: response.status() });
      });

      try {
        const response = await page.goto(`${baseUrl}${scenario.url}`, {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        });
        await page.locator("body").waitFor({ state: "visible", timeout: 15_000 });
        await page.evaluate(async () => {
          if (document.fonts?.ready) await document.fonts.ready;
        });
        await page.waitForTimeout(500);

        const metrics = await page.evaluate(() => {
          const root = document.documentElement;
          const bodyText = document.body.innerText;
          return {
            clientWidth: root.clientWidth,
            scrollWidth: root.scrollWidth,
            scrollHeight: root.scrollHeight,
            h1: document.querySelector("h1")?.textContent?.trim() ?? null,
            title: document.title,
            robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null,
            bodyText,
          };
        });

        const status = response?.status() ?? 0;
        const overflow = metrics.scrollWidth > metrics.clientWidth + 1;
        const localFindings = [];

        if (!response || status >= 400) localFindings.push(`HTTP_${status || "NO_RESPONSE"}`);
        if (!metrics.h1) localFindings.push("MISSING_H1");
        if (overflow) localFindings.push(`HORIZONTAL_OVERFLOW_${metrics.scrollWidth}_${metrics.clientWidth}`);
        if (!metrics.bodyText.includes(scenario.expectedText)) localFindings.push("EXPECTED_TEXT_MISSING");
        if (scenario.expectedSecondaryText && !metrics.bodyText.includes(scenario.expectedSecondaryText)) {
          localFindings.push("EXPECTED_SECONDARY_TEXT_MISSING");
        }
        if (scenario.expectNoIndex && !(metrics.robots ?? "").toLowerCase().includes("noindex")) {
          localFindings.push("DEMO_MISSING_NOINDEX");
        }
        if (consoleErrors.length > 0) localFindings.push(`CONSOLE_ERRORS_${consoleErrors.length}`);
        if (responseErrors.length > 0) localFindings.push(`RESOURCE_HTTP_ERRORS_${responseErrors.length}`);

        const screenshot = `${scenario.name}-${viewport}.png`;
        await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });

        results.push({
          scenario: scenario.name,
          url: scenario.url,
          viewport,
          width,
          height,
          status,
          overflow,
          screenshot,
          h1: metrics.h1,
          title: metrics.title,
          robots: metrics.robots,
          consoleErrors: consoleErrors.slice(0, 10),
          responseErrors: responseErrors.slice(0, 10),
          findings: localFindings,
        });
        findings.push(...localFindings.map((finding) => ({ scenario: scenario.name, viewport, finding })));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        findings.push({ scenario: scenario.name, viewport, finding: `AUDIT_ERROR_${message}` });
        results.push({ scenario: scenario.name, url: scenario.url, viewport, error: message });
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "PARTNER_PAGES_DEEP_AUDIT_V1",
  generatedAt: new Date().toISOString(),
  scenarioCount: scenarios.length,
  viewportCount: viewports.length,
  expectedScreenshotCount: scenarios.length * viewports.length,
  screenshotCount: results.filter((result) => result.screenshot).length,
  findingCount: findings.length,
  findingScenarioCount: new Set(findings.map((finding) => finding.scenario)).size,
  findings,
  results,
};

await writeFile(path.join(outputDir, "metrics.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  scenarioCount: report.scenarioCount,
  expectedScreenshotCount: report.expectedScreenshotCount,
  screenshotCount: report.screenshotCount,
  findingCount: report.findingCount,
  findingScenarioCount: report.findingScenarioCount,
}, null, 2));

if (report.screenshotCount !== report.expectedScreenshotCount || report.findingCount !== 0) {
  throw new Error(
    `Partner pages audit failed: ${report.screenshotCount}/${report.expectedScreenshotCount} screenshots, ${report.findingCount} finding(s)`,
  );
}
