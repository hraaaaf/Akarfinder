import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3217";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/hvr-2-city-direct-nav");
const scenarios = [
  { name: "hvr2-home-390x844", width: 390, height: 844 },
  { name: "hvr2-home-430x932", width: 430, height: 932 },
  { name: "hvr2-home-768x900", width: 768, height: 900 },
  { name: "hvr2-home-1280x900", width: 1280, height: 900 },
];

const cities = ["Casablanca", "Rabat", "Marrakech", "Tanger", "Agadir", "Fès"];
const expectedHref = (city) => `/search?${new URLSearchParams({ city }).toString()}`;

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
      const section = page.locator('[data-hvr2-city-grid="direct"]');
      await section.waitFor({ state: "visible", timeout: 20_000 });

      const metrics = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));

      if ((response?.status() ?? 0) !== 200) localFindings.push(`HTTP_${response?.status() ?? 0}`);
      if (metrics.scrollWidth > metrics.clientWidth + 1) localFindings.push(`OVERFLOW_${metrics.scrollWidth}_${metrics.clientWidth}`);

      const cards = section.locator("a[data-hvr2-city-card]");
      const count = await cards.count();
      if (count !== cities.length) localFindings.push(`CITY_CARD_COUNT_${count}`);

      const hrefs = [];
      for (let index = 0; index < Math.min(count, cities.length); index += 1) {
        const href = await cards.nth(index).getAttribute("href");
        hrefs.push(href);
        const expected = expectedHref(cities[index]);
        if (href !== expected) localFindings.push(`CITY_HREF_${cities[index]}_${href ?? "missing"}`);
      }

      const bodyText = await page.locator("body").innerText();
      for (const forbidden of ["Votre projet à", "Ville choisie", "Choisissez une intention"]) {
        if (bodyText.includes(forbidden)) localFindings.push(`OLD_TWO_STEP_COPY_${forbidden.replace(/\s+/g, "_")}`);
      }

      if (!bodyText.includes("Explorer le Maroc")) localFindings.push("MISSING_EXPLORER_TITLE");
      if (!bodyText.includes("Voir les biens")) localFindings.push("MISSING_CITY_ACTION_COPY");

      const firstCard = cards.first();
      await firstCard.focus();
      const focusedTag = await page.evaluate(() => document.activeElement?.tagName ?? null);
      if (focusedTag !== "A") localFindings.push(`CITY_CARD_NOT_KEYBOARD_FOCUSABLE_${focusedTag ?? "none"}`);

      const screenshot = `${scenario.name}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });

      results.push({
        ...scenario,
        screenshot,
        findings: localFindings,
        consoleErrors,
        ...metrics,
        cityCardCount: count,
        hrefs,
        focusedTag,
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

  const navPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await navPage.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const firstCard = navPage.locator('a[data-hvr2-city-card="casablanca"]');
    await firstCard.waitFor({ state: "visible", timeout: 20_000 });
    await firstCard.click();
    await navPage.waitForURL((url) => url.pathname === "/search" && url.searchParams.get("city") === "Casablanca", { timeout: 20_000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    findings.push({ scenario: "navigation", finding: `DIRECT_NAV_ERROR_${message}` });
  } finally {
    await navPage.close();
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "HVR_2_CITY_DIRECT_NAV_PROOF_V1",
  generatedAt: new Date().toISOString(),
  scenarioCount: scenarios.length,
  screenshotCount: results.filter((item) => item.screenshot).length,
  findingCount: findings.length,
  findings,
  results,
};

await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ scenarioCount: report.scenarioCount, screenshotCount: report.screenshotCount, findingCount: report.findingCount, findings }, null, 2));
if (report.screenshotCount !== scenarios.length) throw new Error(`HVR-2 capture incomplete: ${report.screenshotCount}/${scenarios.length}`);
if (findings.length > 0) throw new Error(`HVR-2 direct-city proof failed with ${findings.length} finding(s)`);
