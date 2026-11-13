import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const port = 3213;
const baseUrl = "http://127.0.0.1:" + port;
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/neighborhood-context-l5-after";
await mkdir(outDir, { recursive: true });

// Same four November BEFORE surfaces, plus a separate current-time listing QA.
// The historical August QA state is retained for screenshot comparability ONLY.
const states = [
  { name: "homepage", href: "/", selector: '[data-home-neighborhood-card][data-neighborhood-context-converged="district_rabat_agdal"]', city: "rabat", district: "agdal", placement: true },
  { name: "seo-rabat-agdal", href: "/immobilier/rabat/agdal", selector: '[data-p6-stage="vie-locale-detail"] [data-neighborhood-context-converged="district_rabat_agdal"]', city: "rabat", district: "agdal" },
  { name: "listing-vivre-ici", href: "/visual-qa/announcement-page-living-here?state=context", selector: '[data-announcement-living-here="ann-l6"][data-neighborhood-context-converged="district_rabat_agdal"]', fixture: true },
  { name: "listing-live", href: "/visual-qa/announcement-page-living-here?state=live", selector: '[data-announcement-living-here="ann-l6"][data-neighborhood-context-converged="district_rabat_agdal"]', city: "rabat", district: "agdal" },
  { name: "map-maarif", href: "/map?city=Casablanca&district=Ma%C3%A2rif&layer=explore", selector: '[data-p4-map-decision-rail][data-neighborhood-context-converged="district_casablanca_maarif"]', city: "casablanca", district: "maarif" },
];
const viewports = [
  { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
  { name: "768", width: 768, height: 900 },
  { name: "1280", width: 1280, height: 900 },
];

function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
      env: process.env, stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill("SIGTERM");
        reject(new Error("Next readiness timeout: " + output));
      }
    }, 30000);
    const onData = (chunk) => {
      const part = String(chunk);
      output += part;
      process.stdout.write(part);
      if (!settled && /Ready in|Local:\s+http/i.test(output)) {
        settled = true;
        clearTimeout(timeout);
        resolve(child);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      if (!settled) { settled = true; reject(new Error("Next exited " + code + ": " + output)); }
    });
  });
}
async function stopServer(child) {
  if (child.exitCode != null || child.signalCode != null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 3000))]);
}

async function runtimeContext(page, city, district) {
  const url = baseUrl + "/api/geo/neighborhood-context?city=" + encodeURIComponent(city) + "&district=" + encodeURIComponent(district);
  const response = await page.request.get(url, { timeout: 20000 });
  if (!response.ok()) throw new Error("Runtime context API rejected: " + response.status() + " / " + url);
  const data = await response.json();
  if (data.status !== "ok" || data.context?.version !== "NeighborhoodContextReadModelV1")
    throw new Error("Runtime context API failed closed unexpectedly: " + JSON.stringify(data).slice(0, 300));
  const model = data.context;
  const observedAt = Date.parse(model.source?.observed_at ?? "");
  if (!Number.isFinite(observedAt) || observedAt > Date.now())
    throw new Error("Invalid NCI source observed_at");
  if (model.anchor_count !== model.anchors.length) throw new Error("NCI anchor count mismatch");
  if (model.coverage_status === "unavailable" && model.anchor_count !== 0)
    throw new Error("Unavailable NCI advertises anchors");
  if (model.anchors.some((anchor) =>
    anchor.freshness_status !== "fresh" || !anchor.poi_id || !anchor.source_id || !anchor.attribution ||
    Date.now() - Date.parse(anchor.observed_at) > 30 * 24 * 60 * 60 * 1000))
    throw new Error("Stale or unproven anchor exposed via API");
  return {
    canonicalId: model.canonical_neighborhood_id,
    coverage: model.coverage_status,
    anchorCount: model.anchor_count,
    poiIds: model.anchors.map((anchor) => anchor.poi_id),
    sourceObservedAt: model.source.observed_at,
  };
}

const report = {
  schema: "NEIGHBORHOOD_CONTEXT_L5_AFTER_LIVE_TRUTH_2026_11_V1",
  generatedAt: new Date().toISOString(),
  testedCommitOrMergeRef: process.env.GITHUB_SHA ?? null,
  expectedCaptureCount: states.length * viewports.length,
  scope: "Five states, four viewports; no production or external POI publication",
  historicalFixtureNotLive: true,
  liveCoverageCertified: false,
  uxScoreCertified: false,
  cases: [],
  findings: [],
};

const server = await startServer();
const browser = await chromium.launch({ headless: true });
try {
  for (const state of states) {
    for (const viewport of viewports) {
      const key = state.name + "/" + viewport.name;
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const diagnostics = { pageErrors: [] };
      page.on("pageerror", (error) => diagnostics.pageErrors.push(String(error)));
      try {
        await page.goto(baseUrl + state.href, { waitUntil: "domcontentloaded", timeout: 35000 });
        const target = page.locator(state.selector).first();
        await target.waitFor({ state: "visible", timeout: 25000 });
        if (state.name === "map-maarif") {
          const map = page.locator('[data-maplibre-spike][data-maplibre-city="casablanca"][data-maplibre-district="maarif"]');
          await map.waitFor({ state: "visible", timeout: 25000 });
          await page.waitForFunction(() =>
            document.querySelector('[data-maplibre-spike][data-maplibre-city="casablanca"][data-maplibre-district="maarif"]')?.getAttribute("data-maplibre-render-state") === "ready",
            null, { timeout: 25000 },
          );
        }
        if (state.placement) {
          await page.locator('[data-home-city-layout="compact-v1"]').evaluate((node) => {
            const bottom = node.getBoundingClientRect().bottom + window.scrollY;
            window.scrollTo(0, Math.max(0, bottom - 140));
          });
        } else {
          await target.scrollIntoViewIfNeeded();
        }
        await page.waitForTimeout(450);
        const evidence = await target.evaluate((element) => ({
          canonicalId: element.getAttribute("data-neighborhood-context-converged"),
          coverage: element.getAttribute("data-neighborhood-context-coverage"),
          anchorCount: Number(element.getAttribute("data-neighborhood-context-anchor-count") || "0"),
          poiIds: (element.getAttribute("data-neighborhood-context-poi-ids") || "").split(",").filter(Boolean),
          text: (element.textContent || "").slice(0, 1200),
        }));
        const metrics = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          homepageCards: document.querySelectorAll("[data-home-neighborhood-card]").length,
        }));
        if (diagnostics.pageErrors.length) report.findings.push(key + ":page_errors:" + diagnostics.pageErrors.join("|"));
        if (metrics.overflow > 1) report.findings.push(key + ":horizontal_overflow:" + metrics.overflow);
        if (evidence.anchorCount !== evidence.poiIds.length) report.findings.push(key + ":anchor_count_mismatch");

        if (state.fixture) {
          // Historical regression remains positive (four August anchors) and is
          // deliberately NOT compared with November public API freshness.
          if (evidence.canonicalId !== "district_rabat_agdal" ||
              evidence.coverage !== "partial" || evidence.anchorCount !== 4)
            report.findings.push(key + ":historical_fixture_changed");
        } else {
          const expected = await runtimeContext(page, state.city, state.district);
          if (evidence.canonicalId !== expected.canonicalId ||
              evidence.coverage !== expected.coverage ||
              evidence.anchorCount !== expected.anchorCount ||
              evidence.poiIds.join("|") !== expected.poiIds.join("|"))
            report.findings.push(key + ":live_runtime_mismatch:" + JSON.stringify({ evidence, expected }));
        }
        if (state.name === "homepage") {
          if (metrics.homepageCards !== 3) report.findings.push(key + ":expected_three_homepage_neighborhoods");
          const section = page.locator('[data-home-neighborhood-intelligence="nci-l5"]');
          await section.waitFor({ state: "visible" });
          if (await section.getByRole("link", { name: /Explorer la carte/ }).count() !== 1)
            report.findings.push(key + ":map_link_missing");
          const sectionText = (await section.textContent()) || "";
          if (/Repère prix|5 repères vérifiés|©2026 fictif/i.test(sectionText))
            report.findings.push(key + ":unsourced_claim");
          if (evidence.anchorCount === 0 && !/Repères indisponibles/i.test(evidence.text))
            report.findings.push(key + ":unavailable_state_not_visible");
          const cardBox = await target.boundingBox();
          if (!cardBox || cardBox.width < 44 || cardBox.height < 44)
            report.findings.push(key + ":card_touch_target_under_44px");
        }
        if (state.name === "listing-live") {
          if (await target.locator("[data-exact-property-measurements]").count() !== 0)
            report.findings.push(key + ":centroid_must_not_have_exact_routes");
        }
        if (state.name === "map-maarif" && evidence.anchorCount === 0 &&
            await page.locator('[data-vivre-ici-empty-context="true"]').count() !== 1)
          report.findings.push(key + ":map_unavailable_state_missing");
        const filename = state.name + "-" + viewport.name + "-after.png";
        await page.screenshot({ path: outDir + "/" + filename, fullPage: false, animations: "disabled" });
        report.cases.push({
          state: state.name, viewport: viewport.name, filename,
          historicalFixture: Boolean(state.fixture), ...metrics,
          evidence: { ...evidence, text: evidence.text.slice(0, 450) }, diagnostics,
        });
      } catch (error) {
        report.findings.push(key + ":test_exception:" + String(error));
        try {
          await page.screenshot({ path: outDir + "/" + state.name + "-" + viewport.name + "-failure.png", fullPage: false });
        } catch {}
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
  await stopServer(server);
}
report.ok = report.cases.length === report.expectedCaptureCount && report.findings.length === 0;
await writeFile(outDir + "/report.json", JSON.stringify(report, null, 2) + "\n", "utf8");
if (!report.ok) throw new Error("L5 November AFTER truth gate FAILED: " + JSON.stringify(report.findings).slice(0, 9000));
console.log("L5 November AFTER PASS: " + report.cases.length + "/" + report.expectedCaptureCount + " captures; common read-model; zero stale public POIs. Coverage certification NOT claimed.");
