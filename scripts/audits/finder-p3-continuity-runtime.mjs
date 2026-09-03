import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { companionProfileToSearchParams } from "../../lib/companion-v1/search-entry.ts";

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
  property: { property_types: ["Appartement"], required_features: [], excluded_features: [] },
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
  // 1) Anonymous continuity: wait for client hydration, then prove Search reads the pending profile.
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
    await page.waitForFunction(
      (key) => Array.isArray(window.__akarAuditStorageReads) && window.__akarAuditStorageReads.includes(key),
      pendingKey,
      { timeout: 15_000 },
    ).catch(() => undefined);
    const reads = await page.evaluate(() => window.__akarAuditStorageReads ?? []);
    const storageRead = reads.includes(pendingKey);
    if (!storageRead) findings.push("ANON_PENDING_PROFILE_NOT_READ");
    assertSafeUrl(page.url(), "ANON");
    results.anonymous = { storageRead, reads, url: page.url() };
    await context.close();
  }

  // 2) Authenticated project continuity: instrument the exact browser fetch API used by Search before React hydrates.
  {
    const context = await browser.newContext();
    await context.addInitScript(({ continuityBody }) => {
      const calls = [];
      Object.defineProperty(window, "__akarAuditFetchCalls", { value: calls, configurable: true });
      const originalFetch = window.fetch.bind(window);
      window.fetch = async function auditedFetch(input, init) {
        const raw = typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
        const url = new URL(raw, window.location.href);
        calls.push(url.pathname);
        if (url.pathname === "/api/me/continuity") {
          return new Response(continuityBody, {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return originalFetch(input, init);
      };
    }, { continuityBody: JSON.stringify({ projects: [{ id: "audit-project", profile }] }) });

    const page = await context.newPage();
    const response = await page.goto(`${baseUrl}/search?guided=1&profile_version=2.0&city=Rabat&project_id=audit-project`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if ((response?.status() ?? 0) !== 200) findings.push(`PROJECT_SEARCH_HTTP_${response?.status() ?? 0}`);
    await page.locator("[data-search-results-section]").waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForFunction(
      () => Array.isArray(window.__akarAuditFetchCalls) && window.__akarAuditFetchCalls.includes("/api/me/continuity"),
      undefined,
      { timeout: 15_000 },
    ).catch(() => undefined);
    const calls = await page.evaluate(() => window.__akarAuditFetchCalls ?? []);
    const continuityHits = calls.filter((pathname) => pathname === "/api/me/continuity").length;
    if (continuityHits < 1) findings.push("PROJECT_CONTINUITY_NOT_REQUESTED");
    const url = assertSafeUrl(page.url(), "PROJECT");
    if (url.searchParams.get("project_id") !== "audit-project") findings.push("PROJECT_ID_MISSING");
    results.project = { continuityHits, calls, url: page.url() };
    await context.close();
  }

  // 3) Workspace resume contract: verify the exact shared projection function used by the workspace.
  {
    const params = companionProfileToSearchParams(profile);
    params.set("project_id", "audit-project");
    const href = `/search?${params.toString()}`;
    const url = assertSafeUrl(new URL(href, baseUrl).toString(), "WORKSPACE");
    if (url.searchParams.get("project_id") !== "audit-project") findings.push("WORKSPACE_PROJECT_ID_MISSING");
    if (url.searchParams.get("guided") !== "1") findings.push("WORKSPACE_GUIDED_MISSING");
    if (url.searchParams.get("city") !== "Rabat") findings.push("WORKSPACE_CITY_MISSING");
    if (url.searchParams.get("property_type") !== "Appartement") findings.push("WORKSPACE_PROPERTY_TYPE_MISSING");
    results.workspace = { href };
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
