import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3218";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/finder-p4-accessibility");
const runAudit = process.env.P4_AUDIT === "1";
const viewports = [
  { name: "390", width: 390, height: 844 },
  { name: "1280", width: 1280, height: 900 },
];
const focusableSelector = [
  'a[href]',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const findings = [];
const scenarios = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error)));

    const response = await page.goto(`${baseUrl}/search`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if ((response?.status() ?? 0) !== 200) findings.push(`${viewport.name}_HTTP_${response?.status() ?? 0}`);

    const launcher = page.locator("[data-finder-launcher]");
    await launcher.waitFor({ state: "visible", timeout: 20_000 });
    await launcher.click();

    const panel = page.locator("[data-finder-panel]");
    await panel.waitFor({ state: "visible", timeout: 20_000 });
    const ariaModal = await panel.getAttribute("aria-modal");
    const role = await panel.getAttribute("role");
    if (role !== "dialog") findings.push(`${viewport.name}_DIALOG_ROLE`);
    if (ariaModal !== "true") findings.push(`${viewport.name}_ARIA_MODAL`);

    await page.screenshot({ path: path.join(outputDir, `akar-sense-open-${viewport.name}.png`), fullPage: false });

    const metrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyOverflow: document.body.style.overflow,
    }));
    if (metrics.scrollWidth > metrics.innerWidth) findings.push(`${viewport.name}_HORIZONTAL_OVERFLOW`);
    if (metrics.bodyOverflow !== "hidden") findings.push(`${viewport.name}_SCROLL_NOT_LOCKED`);
    if (pageErrors.length > 0) findings.push(`${viewport.name}_PAGE_ERRORS`);

    const result = { viewport, role, ariaModal, metrics, pageErrors };

    if (runAudit && viewport.name === "390") {
      await page.waitForFunction(() => {
        const panelElement = document.querySelector("[data-finder-panel]");
        return !!panelElement && panelElement.contains(document.activeElement);
      }, { timeout: 5_000 }).catch(() => undefined);

      const initialFocusInside = await page.evaluate(() => {
        const panelElement = document.querySelector("[data-finder-panel]");
        return !!panelElement && panelElement.contains(document.activeElement);
      });
      if (!initialFocusInside) findings.push("INITIAL_FOCUS_OUTSIDE_DIALOG");

      const focusableCount = await panel.locator(focusableSelector).count();
      if (focusableCount < 1) findings.push("NO_FOCUSABLE_ELEMENTS");

      let shiftTabWrapped = false;
      let tabWrapped = false;
      if (focusableCount > 0) {
        const focusables = panel.locator(focusableSelector);
        const first = focusables.first();
        const last = focusables.last();

        await first.focus();
        await page.keyboard.press("Shift+Tab");
        shiftTabWrapped = await last.evaluate((element) => document.activeElement === element);
        if (!shiftTabWrapped) findings.push("SHIFT_TAB_NOT_TRAPPED");

        await last.focus();
        await page.keyboard.press("Tab");
        tabWrapped = await first.evaluate((element) => document.activeElement === element);
        if (!tabWrapped) findings.push("TAB_NOT_TRAPPED");
      }

      await page.keyboard.press("Escape");
      await panel.waitFor({ state: "detached", timeout: 5_000 }).catch(() => undefined);
      const closed = (await page.locator("[data-finder-panel]").count()) === 0;
      if (!closed) findings.push("ESCAPE_DID_NOT_CLOSE");

      const focusReturned = await launcher.evaluate((element) => document.activeElement === element);
      if (!focusReturned) findings.push("FOCUS_NOT_RESTORED");

      Object.assign(result, { initialFocusInside, focusableCount, shiftTabWrapped, tabWrapped, closed, focusReturned });
    }

    scenarios.push(result);
    await context.close();
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: runAudit ? "AKAR_SENSE_P4_ACCESSIBILITY_RUNTIME_V1" : "AKAR_SENSE_P4_VISUAL_V1",
  findingCount: findings.length,
  findings,
  scenarioCount: scenarios.length,
  scenarios,
};

await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (findings.length > 0) throw new Error(`P4 audit failed: ${findings.join(", ")}`);
