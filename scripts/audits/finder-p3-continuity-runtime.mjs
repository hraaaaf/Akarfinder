import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3218";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/finder-p3-proof/continuity");
const pendingKey = "akarfinder-pending-project-v2";
const privateKeys = ["children_count", "remote_work", "anchor", "anchors", "personal_context", "tolerances"];

const profile = {
  version: "2.0",
  objective: { value: "buy" },
  intended_uses: { value: ["family_housing"] },
  location: {
    preferred_cities: ["Rabat"],
    preferred_neighborhoods: [],
    excluded_neighborhoods: [],
    anchors: [{ label: "Technopolis", max_minutes: 25 }],
  },
  budget: { purchase_max_mad: 1800000, budget_flex_pct: 5 },
  property: { property_types: ["Appartement"], required_features: [] },
  neighborhood_preferences: [{ key: "family_fit", direction: "prefer", importance: "high" }],
  priorities: ["family_fit"],
  personal_context: {
    children_count: { value: 2 },
    remote_work: { value: true },
  },
};

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const findings = [];
const results = {};

function assertSafeUrl(rawUrl, label) {
  const url = new URL(rawUrl);
  for (const key of privateKeys) {
    if (url.searchParams.has(key)) findings.push(`${label}_PRIVATE_URL_${key}`);
  }
  return url;
}

try {
  // 1) Anonymous continuity: Search must read the pending full profile from sessionStorage.
  {
    const context = await browser.newContext();
    await context.addInitScript(({ key, value }) => {
      const reads = [];
      Object.defineProperty(window, "__akarAuditStorageReads", { value: reads, configurable: true });
      const original = Storage.prototype.getItem;
      Storage.prototype.getItem = function patchedGetItem(name) {
        if (this === window.sessionStorage) reads.push(name);
        return original.call(this, name);
      };
      window.sessionStorage.setItem(key, value);
    }, { key: pendingKey, value: JSON.stringify({ profile }) });

    const page = await context.newPage();
    const response = await page.goto(`${baseUrl}/search?guided=1&profile_version=2.0&city=Rabat`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if ((response?.status() ?? 0) !== 200) findings.push(`ANON_SEARCH_HTTP_${response?.status() ?? 0}`);
    await page.locator("[data-search-results-section]").waitFor({ state: "visible", timeout: 20_000 });
    const reads = await page.evaluate(() => window.__akarAuditStorageReads ?? []);
    const storageRead = reads.includes("akarfinder-pending-project-v2");
    if (!storageRead) findings.push("ANON_PENDING_PROFILE_NOT_READ");
    assertSafeUrl(page.url(), "ANON");
    results.anonymous = { storageRead, reads, url: page.url() };
    await context.close();
  }

  // 2) Authenticated project continuity: Search with project_id must request continuity and keep rich context out of the URL.
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    let continuityHits = 0;
    await page.route("**/api/me/continuity", async (route) => {
      continuityHits += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ projects: [{ id: "audit-project", profile }] }),
      });
    });
    const response = await page.goto(`${baseUrl}/search?guided=1&profile_version=2.0&city=Rabat&project_id=audit-project`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if ((response?.status() ?? 0) !== 200) findings.push(`PROJECT_SEARCH_HTTP_${response?.status() ?? 0}`);
    await page.locator("[data-search-results-section]").waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForFunction(() => performance.getEntriesByType("resource").some((entry) => entry.name.includes("/api/me/continuity")), null, { timeout: 10_000 }).catch(() => undefined);
    if (continuityHits < 1) findings.push("PROJECT_CONTINUITY_NOT_REQUESTED");
    const url = assertSafeUrl(page.url(), "PROJECT");
    if (url.searchParams.get("project_id") !== "audit-project") findings.push("PROJECT_ID_MISSING");
    results.project = { continuityHits, url: page.url() };
    await context.close();
  }

  // 3) Workspace resume: authenticated project link must rebuild only the safe URL projection plus project_id.
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: "audit-user" } }) });
    });
    await page.route("**/api/me/continuity", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "audit-user", email: "audit@example.test" },
          projects: [{ id: "audit-project", name: "Projet audit", status: "active", profile, updated_at: "2026-09-02T20:00:00.000Z" }],
          favorites: [], saved_searches: [], history: [], comparisons: [], eliminated: [], preferences: [],
        }),
      });
    });
    const response = await page.goto(`${baseUrl}/mon-projet/espace`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if ((response?.status() ?? 0) !== 200) findings.push(`WORKSPACE_HTTP_${response?.status() ?? 0}`);
    const resume = page.getByRole("link", { name: "Reprendre la recherche" }).first();
    await resume.waitFor({ state: "visible", timeout: 15_000 });
    const href = await resume.getAttribute("href");
    if (!href) findings.push("WORKSPACE_RESUME_HREF_MISSING");
    else {
      const url = assertSafeUrl(new URL(href, baseUrl).toString(), "WORKSPACE");
      if (url.searchParams.get("project_id") !== "audit-project") findings.push("WORKSPACE_PROJECT_ID_MISSING");
      if (url.searchParams.get("guided") !== "1") findings.push("WORKSPACE_GUIDED_MISSING");
      results.workspace = { href };
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "AKAR_SENSE_P3_CONTINUITY_RUNTIME_V1",
  findingCount: findings.length,
  findings,
  results,
};
await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (findings.length > 0) throw new Error(`P3 continuity runtime audit failed: ${findings.join(", ")}`);
