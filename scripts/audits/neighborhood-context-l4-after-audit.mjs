import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const port = 3211;
const baseUrl = `http://127.0.0.1:${port}`;
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/neighborhood-context-l4-after";
await mkdir(outDir, { recursive: true });

const states = [
  { name: "national", href: "/map?layer=explore", city: null, district: null },
  { name: "rabat-city", href: "/map?city=rabat&layer=explore", city: "rabat", district: null },
  { name: "rabat-agdal", href: "/map?city=rabat&district=agdal&layer=explore", city: "rabat", district: "agdal" },
  { name: "casablanca-maarif", href: "/map?city=casablanca&district=maarif&layer=explore", city: "casablanca", district: "maarif" },
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
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGTERM");
      reject(new Error(`Next server readiness timeout. Output:\n${output}`));
    }, 25000);
    const onData = (chunk) => {
      const text = String(chunk);
      output += text;
      process.stdout.write(text);
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
      if (!settled) {
        settled = true;
        reject(new Error(`Next server exited ${code}. Output:\n${output}`));
      }
    });
  });
}

async function stopServer(child) {
  if (child.exitCode != null || child.signalCode != null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 3000))]);
}

function groupForCategory(category) {
  if (["transport", "education", "health", "groceries", "green_sport"].includes(category)) return category;
  return "services";
}

const report = {
  schema: "NEIGHBORHOOD_CONTEXT_L4_AFTER_V1",
  generated_at: new Date().toISOString(),
  exact_head: process.env.GITHUB_SHA || null,
  expected_capture_count: states.length * viewports.length,
  captures: [],
  interactions: [],
  contexts: {},
  findings: [],
};

const server = await startServer();
try {
  for (const state of states) {
    if (!state.city || !state.district) continue;
    const response = await fetch(`${baseUrl}/api/geo/neighborhood-context?city=${state.city}&district=${state.district}`);
    const payload = await response.json();
    if (!response.ok || payload?.status !== "ok") {
      report.findings.push(`${state.name}:context_api:${response.status}`);
      continue;
    }
    report.contexts[state.name] = payload.context;
  }

  const browser = await chromium.launch({ headless: true });
  try {
    for (const state of states) {
      const expectedContext = report.contexts[state.name] ?? null;
      const expectedMarkers = expectedContext ? Math.min(Number(expectedContext.anchor_count || 0), 8) : 0;
      for (const viewport of viewports) {
        const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
        const diagnostics = { pageErrors: [], requestFailures: [] };
        page.on("pageerror", (error) => diagnostics.pageErrors.push(String(error)));
        page.on("requestfailed", (request) => diagnostics.requestFailures.push({
          url: request.url(),
          error: request.failure()?.errorText || "unknown",
        }));
        try {
          await page.goto(`${baseUrl}${state.href}`, { waitUntil: "domcontentloaded", timeout: 30000 });
          for (const loaderText of ["Chargement de la carte…", "Chargement de la carte des quartiers…"]) {
            await page.getByText(loaderText, { exact: true }).waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});
          }
          await page.locator(".maplibregl-canvas").waitFor({ state: "visible", timeout: 20000 });

          if (state.district && expectedMarkers > 0) {
            await page.locator("[data-neighborhood-context-poi-toggle]").waitFor({ state: "visible", timeout: 15000 });
            await page.waitForFunction(
              (count) => document.querySelectorAll("[data-neighborhood-context-poi]").length === count,
              expectedMarkers,
              { timeout: 15000 },
            );
          } else if (state.district) {
            await page.locator("[data-neighborhood-context-poi-unavailable]").waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
          }

          await page.waitForTimeout(500);
          const metrics = await page.evaluate(() => {
            const controls = Array.from(document.querySelectorAll("[data-neighborhood-context-poi-toggle], [data-neighborhood-context-poi-filter]"));
            const hitTargets = controls.map((node) => {
              const rect = node.getBoundingClientRect();
              return { width: rect.width, height: rect.height };
            });
            return {
              horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              nationalShell: document.querySelectorAll("[data-akarfinder-national-map]").length,
              marketShell: document.querySelectorAll("[data-akarfinder-market-intelligence-map]").length,
              genericShell: document.querySelectorAll('[data-akarfinder-generic-map-shell="true"]').length,
              poiMarkers: document.querySelectorAll("[data-neighborhood-context-poi]").length,
              poiToggle: document.querySelectorAll("[data-neighborhood-context-poi-toggle]").length,
              poiUnavailable: document.querySelectorAll("[data-neighborhood-context-poi-unavailable]").length,
              minHitWidth: hitTargets.length ? Math.min(...hitTargets.map((item) => item.width)) : null,
              minHitHeight: hitTargets.length ? Math.min(...hitTargets.map((item) => item.height)) : null,
            };
          });

          if (diagnostics.pageErrors.length) report.findings.push(`${state.name}/${viewport.name}:page_error`);
          if (metrics.horizontalOverflow > 1) report.findings.push(`${state.name}/${viewport.name}:overflow:${metrics.horizontalOverflow}`);
          if (metrics.nationalShell + metrics.marketShell + metrics.genericShell < 1) report.findings.push(`${state.name}/${viewport.name}:unknown_map_shell`);
          if (!state.district && (metrics.poiMarkers !== 0 || metrics.poiToggle !== 0)) {
            report.findings.push(`${state.name}/${viewport.name}:semantic_zoom_noise`);
          }
          if (state.district && expectedMarkers > 0) {
            if (metrics.poiToggle !== 1) report.findings.push(`${state.name}/${viewport.name}:toggle:${metrics.poiToggle}`);
            if (metrics.poiMarkers !== expectedMarkers) report.findings.push(`${state.name}/${viewport.name}:markers:${metrics.poiMarkers}/${expectedMarkers}`);
            if ((metrics.minHitHeight ?? 0) < 44 || (metrics.minHitWidth ?? 0) < 44) {
              report.findings.push(`${state.name}/${viewport.name}:hit_target`);
            }
          }

          const file = `${state.name}-${viewport.name}-after.png`;
          await page.screenshot({ path: `${outDir}/${file}`, fullPage: false });
          report.captures.push({ state: state.name, viewport: viewport.name, file, expectedMarkers, ...metrics, diagnostics });

          if (state.name === "rabat-agdal" && ["390", "1280"].includes(viewport.name) && expectedMarkers > 0) {
            const first = expectedContext.anchors.slice().sort((a, b) => a.rank - b.rank)[0];
            const firstGroup = groupForCategory(first.category);
            const firstGroupFilter = page.locator(`[data-neighborhood-context-poi-filter="${firstGroup}"]`);
            const expectedGroupCount = expectedContext.anchors
              .filter((anchor) => groupForCategory(anchor.category) === firstGroup)
              .slice(0, 8).length;
            if (await firstGroupFilter.count() !== 1) {
              report.findings.push(`${state.name}/${viewport.name}:missing_popup_filter:${firstGroup}`);
            } else {
              await firstGroupFilter.click();
              await page.waitForFunction(
                (count) => document.querySelectorAll("[data-neighborhood-context-poi]").length === count,
                expectedGroupCount,
                { timeout: 5000 },
              );
            }

            await page.locator(`[data-neighborhood-context-poi="${first.poi_id}"]`).click();
            const popup = page.locator(`[data-neighborhood-context-poi-popup="${first.poi_id}"]`);
            await popup.waitFor({ state: "visible", timeout: 5000 });
            const popupText = (await popup.innerText()).replace(/\s+/g, " ").trim();
            if (!popupText.includes(first.name) || !popupText.includes(first.territorial_wording)) {
              report.findings.push(`${state.name}/${viewport.name}:popup_truth_mismatch`);
            }
            if (/\b\d+\s*(min|minute|minutes)\b/i.test(popupText)) {
              report.findings.push(`${state.name}/${viewport.name}:invented_time`);
            }
            if (popupText.includes("Dans le quartier") && first.relation !== "inside_certified_boundary") {
              report.findings.push(`${state.name}/${viewport.name}:false_inside`);
            }
            const interactionFile = `${state.name}-${viewport.name}-poi-popup.png`;
            await page.screenshot({ path: `${outDir}/${interactionFile}`, fullPage: false });
            report.interactions.push({ state: state.name, viewport: viewport.name, file: interactionFile, poi_id: first.poi_id, popupText });

            if (viewport.name === "1280") {
              const allFilter = page.locator('[data-neighborhood-context-poi-filter="all"]');
              if (await allFilter.count() === 1) {
                await allFilter.click();
                await page.waitForFunction(
                  (count) => document.querySelectorAll("[data-neighborhood-context-poi]").length === count,
                  expectedMarkers,
                  { timeout: 5000 },
                );
              }

              const filterButtons = page.locator("[data-neighborhood-context-poi-filter]");
              const filterCount = await filterButtons.count();
              if (filterCount > 1) {
                const filterId = await filterButtons.nth(1).getAttribute("data-neighborhood-context-poi-filter");
                const expectedFiltered = expectedContext.anchors
                  .filter((anchor) => groupForCategory(anchor.category) === filterId)
                  .slice(0, 8).length;
                await filterButtons.nth(1).click();
                await page.waitForFunction(
                  (count) => document.querySelectorAll("[data-neighborhood-context-poi]").length === count,
                  expectedFiltered,
                  { timeout: 5000 },
                );
                const filteredCount = await page.locator("[data-neighborhood-context-poi]").count();
                if (filteredCount !== expectedFiltered) report.findings.push(`${state.name}/1280:filter_count`);
              }
              const toggle = page.locator("[data-neighborhood-context-poi-toggle]");
              await toggle.click();
              await page.waitForFunction(() => document.querySelectorAll("[data-neighborhood-context-poi]").length === 0, null, { timeout: 5000 });
              await toggle.click();
            }
          }
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
} finally {
  await stopServer(server);
}

report.ok = report.captures.length === report.expected_capture_count && report.findings.length === 0;
await writeFile(`${outDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, "utf8");
if (!report.ok) throw new Error(`L4 AFTER failed: ${JSON.stringify(report.findings)}`);
console.log(`L4 AFTER PASS: ${report.captures.length}/${report.expected_capture_count} captures, ${report.interactions.length} popup proofs, 0 findings.`);
