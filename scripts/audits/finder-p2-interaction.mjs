import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3216";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/mon-projet-p2-visual");
const scenarios = [
  { name: "390", width: 390, height: 844, mobile: true },
  { name: "1280", width: 1280, height: 900, mobile: false },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const findings = [];

try {
  for (const scenario of scenarios) {
    const page = await browser.newPage({ viewport: { width: scenario.width, height: scenario.height }, colorScheme: "light", reducedMotion: "reduce" });
    const localFindings = [];
    try {
      const response = await page.goto(`${baseUrl}/search`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      if ((response?.status() ?? 0) !== 200) localFindings.push(`SEARCH_HTTP_${response?.status() ?? 0}`);

      const launcher = page.locator("[data-finder-launcher]");
      await launcher.waitFor({ state: "visible", timeout: 15_000 });
      await launcher.click();

      const panel = page.locator("[data-finder-panel]");
      await panel.waitFor({ state: "visible", timeout: 10_000 });
      const metrics = await panel.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          bodyOverflow: document.body.style.overflow,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        };
      });

      if (metrics.bodyOverflow !== "hidden") localFindings.push("BODY_SCROLL_NOT_LOCKED");
      if (scenario.mobile) {
        if (Math.abs(metrics.width - scenario.width) > 1) localFindings.push(`MOBILE_WIDTH_${metrics.width}`);
        if (Math.abs(metrics.height - scenario.height) > 1) localFindings.push(`MOBILE_HEIGHT_${metrics.height}`);
      } else {
        if (metrics.width < 460 || metrics.width > 522) localFindings.push(`DESKTOP_PANEL_WIDTH_${metrics.width}`);
        if (metrics.left < scenario.width - 522) localFindings.push(`DESKTOP_PANEL_POSITION_${metrics.left}`);
      }

      const screenshot = `finder-open-${scenario.name}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: false });

      await page.keyboard.press("Escape");
      await panel.waitFor({ state: "detached", timeout: 5_000 });
      const restoredOverflow = await page.evaluate(() => document.body.style.overflow);
      if (restoredOverflow === "hidden") localFindings.push("BODY_SCROLL_NOT_RESTORED");

      results.push({ ...scenario, screenshot, metrics, restoredOverflow, findings: localFindings });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      localFindings.push(`AUDIT_ERROR_${message}`);
      results.push({ ...scenario, error: message, findings: localFindings });
    } finally {
      findings.push(...localFindings.map((finding) => ({ scenario: scenario.name, finding })));
      await page.close();
    }
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "FINDER_P2_INTERACTION_V1",
  route: "/search",
  scenarioCount: scenarios.length,
  screenshotCount: results.filter((item) => item.screenshot).length,
  findingCount: findings.length,
  findings,
  results,
};
await writeFile(path.join(outputDir, "finder-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ scenarioCount: report.scenarioCount, screenshotCount: report.screenshotCount, findingCount: report.findingCount, findings }, null, 2));
if (report.screenshotCount !== scenarios.length || report.findingCount > 0) throw new Error(`Finder P2 interaction audit failed: screenshots=${report.screenshotCount}/${scenarios.length}, findings=${report.findingCount}`);
