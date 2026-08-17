import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3214";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/announcement-page-l12-mon-projet");
const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const scenarios = [
  { name: "project-390", route: "/visual-qa/announcement-page-mon-projet", width: 390, height: 844, personalized: true },
  { name: "project-430", route: "/visual-qa/announcement-page-mon-projet", width: 430, height: 932, personalized: true },
  { name: "project-768", route: "/visual-qa/announcement-page-mon-projet", width: 768, height: 900, personalized: true },
  { name: "project-1280", route: "/visual-qa/announcement-page-mon-projet", width: 1280, height: 900, personalized: true },
  { name: "no-project-390", route: "/visual-qa/announcement-page-mon-projet/no-project", width: 390, height: 844, personalized: false },
  { name: "no-project-1280", route: "/visual-qa/announcement-page-mon-projet/no-project", width: 1280, height: 900, personalized: false },
];

const profile = {
  version: "2.0",
  objective: { value: "buy", source: "explicit", confidence: "high", updated_at: "2026-08-17T10:00:00.000Z" },
  intended_uses: { value: ["family_housing"], source: "explicit", confidence: "high", updated_at: "2026-08-17T10:00:00.000Z" },
  personal_context: { freeform_facts: {} },
  location: {
    preferred_cities: ["Rabat"],
    preferred_neighborhoods: [],
    excluded_neighborhoods: [],
    anchors: [
      { label: "Travail", city: "Rabat", latitude: 34.0200, longitude: -6.8300, max_minutes: 20 },
      { label: "École", city: "Rabat", latitude: 33.9850, longitude: -6.8600, max_minutes: 15 },
    ],
    flexible_radius: true,
  },
  budget: { purchase_max_mad: 2500000, rent_monthly_max_mad: null, down_payment_mad: null, budget_flex_pct: 0 },
  property: {
    property_types: ["Appartement"],
    min_surface_m2: 150,
    max_surface_m2: null,
    min_bedrooms: 3,
    max_bedrooms: null,
    required_features: ["parking", "elevator"],
    excluded_features: [],
    new_only: null,
    works_accepted: null,
  },
  absolute_constraints: [],
  neighborhood_preferences: [],
  priorities: [],
  tolerances: {
    tourism_intensity_max: null,
    commute_minutes_max: null,
    renovation_tolerance: "unknown",
    location_flexibility: "city_wide",
    price_flexibility: "strict",
  },
  updated_at: "2026-08-17T10:00:00.000Z",
};

const routeModel = {
  available: true,
  reason: "measured",
  routes: [
    { label: "Travail", destination: { latitude: 34.0200, longitude: -6.8300 }, mode: "driving", status: "measured", distanceMeters: 7200, durationSeconds: 900, maxMinutes: 20, withinTarget: true, providerId: "valhalla", attribution: "Valhalla QA", observedAt: "2026-08-17T10:00:00.000Z" },
    { label: "Travail", destination: { latitude: 34.0200, longitude: -6.8300 }, mode: "walking", status: "measured", distanceMeters: 6500, durationSeconds: 2520, maxMinutes: 20, withinTarget: false, providerId: "valhalla", attribution: "Valhalla QA", observedAt: "2026-08-17T10:00:00.000Z" },
    { label: "École", destination: { latitude: 33.9850, longitude: -6.8600 }, mode: "driving", status: "measured", distanceMeters: 5100, durationSeconds: 720, maxMinutes: 15, withinTarget: true, providerId: "valhalla", attribution: "Valhalla QA", observedAt: "2026-08-17T10:00:00.000Z" },
    { label: "École", destination: { latitude: 33.9850, longitude: -6.8600 }, mode: "walking", status: "measured", distanceMeters: 4700, durationSeconds: 2100, maxMinutes: 15, withinTarget: false, providerId: "valhalla", attribution: "Valhalla QA", observedAt: "2026-08-17T10:00:00.000Z" },
  ],
};

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const findings = [];

try {
  for (const scenario of scenarios) {
    const page = await browser.newPage({ viewport: { width: scenario.width, height: scenario.height }, colorScheme: "light", reducedMotion: "reduce" });
    const localFindings = [];
    const failedResponses = [];
    const consoleErrors = [];
    page.on("response", (response) => { if (response.status() >= 400) failedResponses.push({ url: response.url(), status: response.status() }); });
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

    if (scenario.personalized) {
      await page.route("**/api/me/continuity", async (route) => {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ projects: [{ id: PROJECT_ID, name: "Projet Rabat famille", profile }] }) });
      });
      await page.route("**/api/me/project-routes", async (route) => {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ project_id: PROJECT_ID, listing_id: "visual-qa-ann-l12-project", routes: routeModel }) });
      });
    }

    try {
      const response = await page.goto(`${baseUrl}${scenario.route}`, { waitUntil: "networkidle", timeout: 60_000 });
      await page.locator("body").waitFor({ state: "visible", timeout: 15_000 });
      if (scenario.personalized) await page.locator('[data-project-personalization="ann-l12"]').waitFor({ state: "visible", timeout: 15_000 });
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
      const cardCount = await page.locator('[data-project-personalization="ann-l12"]').count();
      if (scenario.personalized) {
        if (cardCount !== 1) localFindings.push(`PROJECT_CARD_COUNT_${cardCount}`);
        for (const required of ["Mon Projet", "Projet Rabat famille", "Ce bien face à vos critères", "83/100", "Surface", "12 m² sous votre minimum", "Vos trajets", "Travail", "École", "15 min en voiture", "12 min en voiture", "Modifier Mon Projet"]) {
          if (!bodyText.includes(required)) localFindings.push(`MISSING_${required.replace(/\s+/g, "_")}`);
        }
        const edit = page.getByRole("link", { name: "Modifier Mon Projet" });
        if (await edit.count() !== 1) localFindings.push("EDIT_PROJECT_CTA_MISSING");
        else {
          const color = await edit.evaluate((element) => getComputedStyle(element).color);
          if (color !== "rgb(11, 99, 206)") localFindings.push(`EDIT_PROJECT_COLOR_${color}`);
        }
      } else {
        if (cardCount !== 0) localFindings.push(`PROJECT_CARD_LEAK_${cardCount}`);
        if (bodyText.includes("Ce bien face à vos critères")) localFindings.push("PROJECT_COPY_LEAK");
      }

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
  schemaVersion: "ANNOUNCEMENT_PAGE_L12_MON_PROJET_VISUAL_V1_AKARFINDER",
  generatedAt: new Date().toISOString(),
  scenarioCount: scenarios.length,
  screenshotCount: results.filter((item) => item.screenshot).length,
  findingCount: findings.length,
  findings,
  results,
};
await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ scenarioCount: report.scenarioCount, screenshotCount: report.screenshotCount, findingCount: report.findingCount, findings }, null, 2));
if (report.screenshotCount !== scenarios.length) throw new Error(`ANN-L12 capture incomplete: ${report.screenshotCount}/${scenarios.length}`);
if (findings.length > 0) throw new Error(`ANN-L12 visual certification failed with ${findings.length} finding(s)`);
