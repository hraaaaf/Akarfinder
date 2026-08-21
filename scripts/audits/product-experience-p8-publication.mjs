import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3219";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/product-experience-p8-publication");
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

function add(localFindings, condition, code) {
  if (!condition) localFindings.push(code);
}

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport, colorScheme: "light", reducedMotion: "reduce" });
    const localFindings = [];
    try {
      const response = await page.goto(`${baseUrl}/vendre/dossier`, { waitUntil: "networkidle", timeout: 60_000 });
      await page.locator("body").waitFor({ state: "visible", timeout: 15_000 });

      const metrics = await page.evaluate(() => {
        const isVisible = (node) => {
          if (!(node instanceof HTMLElement)) return false;
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
        };
        const visible = (selector) => isVisible(document.querySelector(selector));
        const header = document.querySelector("header");
        const root = document.querySelector("[data-p8-publication-v4]");
        const scoreSignalCount = root
          ? Array.from(root.querySelectorAll("p"))
              .filter((node) => isVisible(node) && /^\d{1,3}\/100(?:\s|$)/.test(node.textContent?.trim() ?? ""))
              .length
          : 0;
        return {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          h1Count: document.querySelectorAll("h1").length,
          mainCount: document.querySelectorAll("main").length,
          canonicalLogoCount: document.querySelectorAll('img[src="/brand/logo-v2/logo-header-light.png"]').length,
          headerBackground: header instanceof HTMLElement ? getComputedStyle(header).backgroundColor : null,
          p8Present: Boolean(root),
          previewVisible: visible("[data-p8-akar-preview]"),
          propertyTypeButtons: document.querySelectorAll('[role="group"][aria-label="Type du bien"] button').length,
          scoreSignalCount,
          bronzeClassCount: Array.from(document.querySelectorAll("[data-p8-publication-v4] [class]"))
            .filter((node) => node.getAttribute("class")?.includes("bronze")).length,
        };
      });

      add(localFindings, (response?.status() ?? 0) === 200, `HTTP_${response?.status() ?? 0}`);
      add(localFindings, metrics.scrollWidth <= metrics.clientWidth + 1, `OVERFLOW_${metrics.scrollWidth}_${metrics.clientWidth}`);
      add(localFindings, metrics.h1Count === 1, `H1_COUNT_${metrics.h1Count}`);
      add(localFindings, metrics.mainCount === 1, `MAIN_COUNT_${metrics.mainCount}`);
      add(localFindings, metrics.canonicalLogoCount >= 1, "CANONICAL_LOGO_MISSING");
      add(localFindings, metrics.headerBackground === "rgb(255, 255, 255)", `HEADER_NOT_EXACT_WHITE_${metrics.headerBackground}`);
      add(localFindings, metrics.p8Present, "P8_SURFACE_MISSING");
      add(localFindings, metrics.propertyTypeButtons >= 6, `P8_PROPERTY_TYPES_${metrics.propertyTypeButtons}`);
      add(localFindings, metrics.scoreSignalCount >= 1, `P8_VISIBLE_SCORE_MISSING_${metrics.scoreSignalCount}`);
      add(localFindings, metrics.bronzeClassCount === 0, `P8_BRONZE_CLASS_COUNT_${metrics.bronzeClassCount}`);
      if (viewport.width >= 1280) {
        add(localFindings, metrics.previewVisible, "P8_DESKTOP_PREVIEW_MISSING");
      }

      const screenshot = `publication-${viewport.width}x${viewport.height}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });

      if (viewport.width === 1280) {
        const apartment = page.getByRole("button", { name: /Appartement/ }).first();
        await apartment.click();
        const continueButton = page.getByRole("button", { name: /Continuer/ });
        await continueButton.click();
        add(localFindings, await page.getByRole("heading", { name: "Ancrez le bien dans son territoire" }).isVisible(), "P8_STEP_2_FAILED");
        await page.getByLabel("Ville *").fill("Rabat");
        await continueButton.click();
        add(localFindings, await page.getByRole("heading", { name: "Décrivez ce qui rend la fiche utile" }).isVisible(), "P8_STEP_3_FAILED");
        await page.getByLabel("Surface principale en m² *").fill("118");
        await continueButton.click();
        add(localFindings, await page.getByRole("heading", { name: "Prix, statut et confiance" }).isVisible(), "P8_STEP_4_FAILED");
        await page.getByRole("button", { name: /Retour/ }).click();
        add(localFindings, await page.getByRole("heading", { name: "Décrivez ce qui rend la fiche utile" }).isVisible(), "P8_BACK_FAILED");
      }

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
  schemaVersion: "AKARFINDER_PRODUCT_EXPERIENCE_P8_V1",
  generatedAt: new Date().toISOString(),
  screenshotCount: results.filter((item) => item.screenshot).length,
  findingCount: findings.length,
  findings,
  results,
};

await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ screenshotCount: report.screenshotCount, findingCount: report.findingCount, findings }, null, 2));
if (report.screenshotCount !== 4) throw new Error(`P8 capture incomplete: ${report.screenshotCount}/4`);
if (findings.length > 0) throw new Error(`P8 certification failed with ${findings.length} finding(s)`);
