import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3218";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/product-experience-p7-mon-projet");
const viewports = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 900 },
  { width: 1280, height: 900 },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const findings = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport, colorScheme: "light", reducedMotion: "reduce" });
    const localFindings = [];
    try {
      const response = await page.goto(`${baseUrl}/mon-projet`, { waitUntil: "networkidle", timeout: 60_000 });
      await page.locator("body").waitFor({ state: "visible", timeout: 15_000 });
      const metrics = await page.evaluate(() => {
        const visible = (selector) => {
          const node = document.querySelector(selector);
          if (!(node instanceof HTMLElement)) return false;
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
        };
        const header = document.querySelector("header");
        const headerBackground = header instanceof HTMLElement ? getComputedStyle(header).backgroundColor : null;
        const continueButtons = Array.from(document.querySelectorAll("button")).filter((node) => node.textContent?.trim().startsWith("Continuer"));
        const bronzeClassCount = Array.from(document.querySelectorAll('[data-p7-mon-projet] [class]')).filter((node) => node.getAttribute("class")?.includes("bronze")).length;
        return {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          h1Count: document.querySelectorAll("h1").length,
          mainCount: document.querySelectorAll("main").length,
          canonicalLogoCount: document.querySelectorAll('img[src="/brand/logo-v2/logo-header-light.png"]').length,
          headerBackground,
          p7Present: Boolean(document.querySelector("[data-p7-mon-projet]")),
          questionPanelPresent: Boolean(document.querySelector("[data-p7-question-panel]")),
          primaryObjectiveCount: document.querySelectorAll("[data-p7-primary-objective]").length,
          exploreSecondaryCount: document.querySelectorAll("[data-p7-explore-secondary]").length,
          stepLabelCount: document.querySelectorAll("[data-p7-step-label]").length,
          desktopRailVisible: visible("[data-p7-progress-rail]"),
          mobileProgressVisible: visible("[data-p7-progress-mobile]"),
          singleQuestionCopy: document.body.innerText.includes("Une question à la fois. Vos réponses deviennent directement des critères de recherche."),
          initialContinueVisible: continueButtons.some((node) => node instanceof HTMLElement && getComputedStyle(node).display !== "none" && node.getBoundingClientRect().height > 0),
          bronzeClassCount,
        };
      });

      if ((response?.status() ?? 0) !== 200) localFindings.push(`HTTP_${response?.status() ?? 0}`);
      if (metrics.scrollWidth > metrics.clientWidth + 1) localFindings.push(`OVERFLOW_${metrics.scrollWidth}_${metrics.clientWidth}`);
      if (metrics.h1Count !== 1) localFindings.push(`H1_COUNT_${metrics.h1Count}`);
      if (metrics.mainCount !== 1) localFindings.push(`MAIN_COUNT_${metrics.mainCount}`);
      if (metrics.canonicalLogoCount < 1) localFindings.push("CANONICAL_LOGO_MISSING");
      if (metrics.headerBackground !== "rgb(255, 255, 255)") localFindings.push(`HEADER_NOT_EXACT_WHITE_${metrics.headerBackground}`);
      if (!metrics.p7Present || !metrics.questionPanelPresent) localFindings.push("P7_SURFACE_MISSING");
      if (metrics.primaryObjectiveCount !== 4) localFindings.push(`P7_PRIMARY_OBJECTIVES_${metrics.primaryObjectiveCount}`);
      if (metrics.exploreSecondaryCount !== 1) localFindings.push(`P7_EXPLORE_SECONDARY_${metrics.exploreSecondaryCount}`);
      if (metrics.stepLabelCount !== 8) localFindings.push(`P7_STEP_LABELS_${metrics.stepLabelCount}`);
      if (!metrics.singleQuestionCopy) localFindings.push("P7_SINGLE_QUESTION_COPY_MISSING");
      if (metrics.initialContinueVisible) localFindings.push("P7_INITIAL_CONTINUE_SHOULD_BE_HIDDEN");
      if (metrics.bronzeClassCount !== 0) localFindings.push(`P7_BRONZE_CLASS_COUNT_${metrics.bronzeClassCount}`);
      if (viewport.width >= 1024) {
        if (!metrics.desktopRailVisible || metrics.mobileProgressVisible) localFindings.push("P7_DESKTOP_PROGRESS_MODE_INVALID");
      } else if (!metrics.mobileProgressVisible || metrics.desktopRailVisible) {
        localFindings.push("P7_MOBILE_PROGRESS_MODE_INVALID");
      }

      const screenshot = `mon-projet-${viewport.width}x${viewport.height}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
      results.push({ ...viewport, screenshot, findings: localFindings, ...metrics });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      localFindings.push(`AUDIT_ERROR_${message}`);
      results.push({ ...viewport, findings: localFindings, error: message });
    } finally {
      findings.push(...localFindings.map((finding) => ({ width: viewport.width, height: viewport.height, finding })));
      await page.close();
    }
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "AKARFINDER_PRODUCT_EXPERIENCE_P7_V1",
  generatedAt: new Date().toISOString(),
  screenshotCount: results.filter((item) => item.screenshot).length,
  findingCount: findings.length,
  findings,
  results,
};

await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ screenshotCount: report.screenshotCount, findingCount: report.findingCount, findings }, null, 2));
if (report.screenshotCount !== 4) throw new Error(`P7 capture incomplete: ${report.screenshotCount}/4`);
if (findings.length > 0) throw new Error(`P7 certification failed with ${findings.length} finding(s)`);
