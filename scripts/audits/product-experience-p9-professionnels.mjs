import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3221";
const outputDir = process.env.OUTPUT_DIR ?? "artifacts/product-experience-p9-professionnels";
const viewports = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 900 },
  { width: 1280, height: 900 },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const rows = [];
const findings = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const response = await page.goto(`${baseUrl}/pro`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(400);

    const metrics = await page.evaluate(() => {
      const root = document.documentElement;
      const surface = document.querySelector("[data-p9-professionnels]");
      const header = document.querySelector("header");
      const text = surface?.textContent ?? "";
      return {
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        h1Count: document.querySelectorAll("h1").length,
        mainCount: document.querySelectorAll("main").length,
        logoCount: document.querySelectorAll('img[alt="AkarFinder"]').length,
        p9Present: Boolean(surface),
        heroPresent: Boolean(document.querySelector("[data-p9-hero]")),
        dashboardPreviewPresent: Boolean(document.querySelector("[data-p9-dashboard-preview]")),
        pillarsPresent: Boolean(document.querySelector("[data-p9-pillars]")),
        standardsPresent: Boolean(document.querySelector("[data-p9-standards]")),
        activationPresent: Boolean(document.querySelector("[data-p9-activation]")),
        pillarCount: document.querySelectorAll("[data-p9-pillars] article").length,
        agencyLinkCount: document.querySelectorAll('a[href="/pro/agences"]').length,
        promoterLinkCount: document.querySelectorAll('a[href="/promoteurs"]').length,
        heroCopy: document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
        headerColor: header ? getComputedStyle(header).backgroundColor : null,
        hasFakeKpis: /(^|\D)(42|18|91%)(\D|$)/.test(text),
        hasDataStates: ["Déclaré par le professionnel", "Calculé par AkarFinder", "Déduit avec prudence", "Non renseigné"].every((label) => text.includes(label)),
        hasTrustRules: text.includes("Le paiement n’achète pas la pertinence organique") && text.includes("Toute visibilité sponsorisée est séparée et clairement labellisée"),
      };
    });

    const status = response?.status() ?? null;
    const screenshot = `professionnels-${viewport.width}x${viewport.height}.png`;
    await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
    const row = { ...viewport, status, ...metrics, screenshot };
    rows.push(row);

    if (status !== 200) findings.push({ ...viewport, finding: `HTTP_${status}` });
    if (metrics.scrollWidth > metrics.clientWidth) findings.push({ ...viewport, finding: "HORIZONTAL_OVERFLOW" });
    if (metrics.h1Count !== 1) findings.push({ ...viewport, finding: `H1_COUNT_${metrics.h1Count}` });
    if (metrics.mainCount !== 1) findings.push({ ...viewport, finding: `MAIN_COUNT_${metrics.mainCount}` });
    if (metrics.logoCount < 1) findings.push({ ...viewport, finding: "CANONICAL_LOGO_MISSING" });
    if (!metrics.p9Present || !metrics.heroPresent || !metrics.dashboardPreviewPresent || !metrics.pillarsPresent || !metrics.standardsPresent || !metrics.activationPresent) findings.push({ ...viewport, finding: "P9_SURFACE_INCOMPLETE" });
    if (metrics.pillarCount !== 3) findings.push({ ...viewport, finding: `PILLAR_COUNT_${metrics.pillarCount}` });
    if (metrics.agencyLinkCount < 1 || metrics.promoterLinkCount < 1) findings.push({ ...viewport, finding: "PRO_JOURNEY_LINK_MISSING" });
    if (metrics.heroCopy !== "Vos annonces, votre identité, notre intelligence territoriale.") findings.push({ ...viewport, finding: "CANONICAL_HERO_COPY_MISMATCH" });
    if (metrics.hasFakeKpis) findings.push({ ...viewport, finding: "FAKE_KPI_PRESENT" });
    if (!metrics.hasDataStates) findings.push({ ...viewport, finding: "DATA_STATE_CONTRACT_MISSING" });
    if (!metrics.hasTrustRules) findings.push({ ...viewport, finding: "TRUST_RULE_CONTRACT_MISSING" });
    await page.close();
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "AKARFINDER_PRODUCT_EXPERIENCE_P9_V1",
  route: "/pro",
  screenshotCount: rows.length,
  findingCount: findings.length,
  findings,
  viewports: rows,
};

await writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (rows.length !== 4 || findings.length) throw new Error(`P9 certification failed with ${findings.length} finding(s)`);
