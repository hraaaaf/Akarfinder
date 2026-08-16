import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3212";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/announcement-page-l11-pro-conversion");
const scenarios = [
  { name: "partner-390", route: "/visual-qa/announcement-page-pro-conversion", width: 390, height: 844, partner: true },
  { name: "partner-430", route: "/visual-qa/announcement-page-pro-conversion", width: 430, height: 932, partner: true },
  { name: "partner-768", route: "/visual-qa/announcement-page-pro-conversion", width: 768, height: 900, partner: true },
  { name: "partner-1280", route: "/visual-qa/announcement-page-pro-conversion", width: 1280, height: 900, partner: true },
  { name: "source-only-390", route: "/visual-qa/announcement-page-pro-conversion/source-only", width: 390, height: 844, partner: false },
  { name: "source-only-1280", route: "/visual-qa/announcement-page-pro-conversion/source-only", width: 1280, height: 900, partner: false },
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
      const response = await page.goto(`${baseUrl}${scenario.route}`, { waitUntil: "networkidle", timeout: 60_000 });
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

      const bodyText = await page.locator("body").innerText();
      const whatsappLinks = await page.locator('a[href^="https://wa.me/"]').count();
      const telLinks = await page.locator('a[href^="tel:"]').count();
      if (telLinks !== 0) localFindings.push(`INFERRED_PHONE_LINK_${telLinks}`);
      if (/profil professionnel complet|#19B/i.test(bodyText)) localFindings.push("LEGACY_PRO_PLACEHOLDER_VISIBLE");

      if (scenario.partner) {
        if (!bodyText.includes("Agence Atlas QA")) localFindings.push("PRO_NAME_MISSING");
        if (!bodyText.includes("Agence Gold")) localFindings.push("AUTHORIZED_BADGE_MISSING");
        if (!bodyText.includes("Demander une visite") && !bodyText.includes("Visite")) localFindings.push("VISIT_CTA_MISSING");
        if (!bodyText.includes("WhatsApp")) localFindings.push("WHATSAPP_CTA_MISSING");
        if (whatsappLinks < 1) localFindings.push("WHATSAPP_LINK_MISSING");
        if (!bodyText.includes("Voir la source d’origine")) localFindings.push("ORIGINAL_SOURCE_CTA_MISSING");
        if (!bodyText.includes("Mon Projet")) localFindings.push("PROJECT_ACTION_MISSING");

        const visitButton = page.getByRole("button", { name: /Demander une visite|Visite/ }).first();
        if (await visitButton.count() !== 1) {
          localFindings.push("VISIT_BUTTON_NOT_UNIQUE");
        } else {
          const visitBg = await visitButton.evaluate((node) => getComputedStyle(node).backgroundColor);
          if (visitBg !== "rgb(11, 99, 206)") localFindings.push(`VISIT_PRIMARY_COLOR_${visitBg}`);
        }

        if (scenario.width >= 1024) {
          const proCard = page.locator('[data-pro-conversion="ann-l11"]');
          if (await proCard.count() !== 1) localFindings.push("DESKTOP_PRO_CARD_MISSING");
          if (!bodyText.includes("Signaler cette annonce")) localFindings.push("REPORT_ACTION_MISSING");
        } else {
          const mobileDock = page.locator('[data-pro-conversion-mobile="ann-l11"]');
          if (await mobileDock.count() !== 1) localFindings.push("MOBILE_CONVERSION_DOCK_MISSING");
          const dockText = await mobileDock.innerText();
          if (dockText.includes("Continuer dans Mon Projet")) localFindings.push("MOBILE_PROJECT_COPY_TOO_LONG");
        }
      } else {
        if (whatsappLinks !== 0) localFindings.push(`SOURCE_ONLY_WHATSAPP_LEAK_${whatsappLinks}`);
        if (bodyText.includes("Demander une visite")) localFindings.push("SOURCE_ONLY_VISIT_LEAK");
        if (!bodyText.includes("Voir la source d’origine")) localFindings.push("SOURCE_ONLY_FALLBACK_MISSING");
        if (scenario.width < 1024 && await page.locator('[data-pro-conversion-mobile="ann-l11"]').count() !== 1) localFindings.push("SOURCE_ONLY_MOBILE_DOCK_MISSING");
      }

      const screenshot = `${scenario.name}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
      results.push({ ...scenario, screenshot, findings: localFindings, failedResponses, consoleErrors, whatsappLinks, telLinks, ...metrics });
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
  schemaVersion: "ANNOUNCEMENT_PAGE_L11_PRO_CONVERSION_VISUAL_V3_PREMIUM_AKARFINDER",
  generatedAt: new Date().toISOString(),
  scenarioCount: scenarios.length,
  screenshotCount: results.filter((item) => item.screenshot).length,
  findingCount: findings.length,
  findings,
  results,
};
await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ scenarioCount: report.scenarioCount, screenshotCount: report.screenshotCount, findingCount: report.findingCount, findings }, null, 2));
if (report.screenshotCount !== scenarios.length) throw new Error(`ANN-L11 capture incomplete: ${report.screenshotCount}/${scenarios.length}`);
if (findings.length > 0) throw new Error(`ANN-L11 visual certification failed with ${findings.length} finding(s)`);