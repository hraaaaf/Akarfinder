import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3216";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/hvr-1-homepage");
const scenarios = [
  { name: "hvr1-home-390x844", width: 390, height: 844 },
  { name: "hvr1-home-430x932", width: 430, height: 932 },
  { name: "hvr1-home-768x900", width: 768, height: 900 },
  { name: "hvr1-home-1280x900", width: 1280, height: 900 },
];
const approvedTitle = "1er moteur de recherche immobilier au Maroc";
const approvedSubtitle = "Cherchez un bien, puis comprenez son quartier, son marché et la fiabilité de l’annonce avant de décider.";
const forbiddenMockupClaims = ["1M+", "1 024 587", "14 580 MAD/m²", "152 annonces / km²", "Données vérifiées"];

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
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    try {
      const response = await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
      const hero = page.locator('[data-home-hero="p1-a1"]');
      const panel = page.locator('[data-home-intelligence="hvr-1"]:visible');
      await hero.waitFor({ state: "visible", timeout: 20_000 });
      await panel.waitFor({ state: "visible", timeout: 20_000 });

      const metrics = await page.evaluate(() => {
        const intelligence = document.querySelector('[data-home-intelligence="hvr-1"]');
        const intelligenceTitle = intelligence?.querySelector("h2");
        return {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          h1Count: document.querySelectorAll("h1").length,
          headerBackground: getComputedStyle(document.querySelector("header") ?? document.body).backgroundColor,
          intelligenceBackground: intelligence ? getComputedStyle(intelligence).backgroundColor : "missing",
          intelligenceTitleColor: intelligenceTitle ? getComputedStyle(intelligenceTitle).color : "missing",
        };
      });

      if ((response?.status() ?? 0) !== 200) localFindings.push(`HTTP_${response?.status() ?? 0}`);
      if (metrics.scrollWidth > metrics.clientWidth + 1) localFindings.push(`OVERFLOW_${metrics.scrollWidth}_${metrics.clientWidth}`);
      if (metrics.h1Count !== 1) localFindings.push(`H1_COUNT_${metrics.h1Count}`);
      if (metrics.headerBackground !== "rgb(255, 255, 255)") localFindings.push(`HEADER_NOT_WHITE_${metrics.headerBackground}`);
      if (metrics.intelligenceBackground !== "rgb(7, 31, 61)") localFindings.push(`INTELLIGENCE_BG_${metrics.intelligenceBackground}`);
      if (metrics.intelligenceTitleColor !== "rgb(255, 255, 255)") localFindings.push(`INTELLIGENCE_TITLE_COLOR_${metrics.intelligenceTitleColor}`);

      const h1Text = (await page.locator("h1").innerText()).trim();
      if (h1Text !== approvedTitle) localFindings.push("H1_COPY_CHANGED");

      const heroText = await hero.innerText();
      const bodyText = await page.locator("body").innerText();
      if (!heroText.includes(approvedSubtitle)) localFindings.push("SUBTITLE_COPY_CHANGED");
      for (const token of forbiddenMockupClaims) {
        if (bodyText.includes(token)) localFindings.push(`FAKE_CLAIM_${token.replace(/\s+/g, "_")}`);
      }

      const intentLabels = await page.locator('[data-home-search-intents="hvr-1"] button').allInnerTexts();
      if (intentLabels.join("|") !== "Acheter|Louer|Neuf") localFindings.push(`INTENTS_${intentLabels.join("_")}`);

      const heroLayout = page.locator('[data-home-hero-layout="hvr-1"]');
      const form = page.locator('[data-home-search="hvr-1"]');
      const layoutBox = await heroLayout.boundingBox();
      const formBox = await form.boundingBox();
      const panelBox = await panel.boundingBox();
      const h1Box = await page.locator("h1").boundingBox();
      const heroBox = await hero.boundingBox();

      if (!layoutBox || !formBox || !panelBox || !h1Box || !heroBox) {
        localFindings.push("MISSING_LAYOUT_BOX");
      } else {
        if (heroBox.height > scenario.height * 0.9) {
          localFindings.push(`HERO_TOO_TALL_${Math.round(heroBox.height)}_${scenario.height}`);
        }
        if (scenario.width >= 1024) {
          if (!(panelBox.x > formBox.x + formBox.width * 0.7)) localFindings.push("DESKTOP_NOT_TWO_COLUMNS");
          if (Math.abs(panelBox.y - h1Box.y) > 150) localFindings.push("DESKTOP_PANEL_VERTICAL_DRIFT");
        } else if (!(panelBox.y > formBox.y + formBox.height)) {
          localFindings.push("MOBILE_INTELLIGENCE_ORDER");
        }
      }

      const screenshot = `${scenario.name}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
      results.push({
        ...scenario,
        screenshot,
        findings: localFindings,
        consoleErrors,
        ...metrics,
        heroHeight: heroBox ? Math.round(heroBox.height) : null,
        h1Text,
        intentLabels,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      localFindings.push(`AUDIT_ERROR_${message}`);
      results.push({ ...scenario, findings: localFindings, consoleErrors, error: message });
    } finally {
      findings.push(...localFindings.map((finding) => ({ scenario: scenario.name, finding })));
      await page.close();
    }
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "HVR_1_HOMEPAGE_VISUAL_PROOF_V3",
  generatedAt: new Date().toISOString(),
  scenarioCount: scenarios.length,
  screenshotCount: results.filter((item) => item.screenshot).length,
  findingCount: findings.length,
  findings,
  results,
};

await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ scenarioCount: report.scenarioCount, screenshotCount: report.screenshotCount, findingCount: report.findingCount, findings }, null, 2));
if (report.screenshotCount !== scenarios.length) throw new Error(`HVR-1 capture incomplete: ${report.screenshotCount}/${scenarios.length}`);
if (findings.length > 0) throw new Error(`HVR-1 visual proof failed with ${findings.length} finding(s)`);
