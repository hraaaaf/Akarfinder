import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const port = 3212;
const baseUrl = `http://127.0.0.1:${port}`;
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/neighborhood-context-l5-before";
await mkdir(outDir, { recursive: true });

// Before the planned homepage reconnection: inspect the FOUR currently live
// surfaces, without pretending August QA fixtures are November live coverage.
const states = [
  { name: "homepage", href: "/", selector: '[data-home-city-layout="compact-v1"]', placement: true },
  { name: "seo-rabat-agdal", href: "/immobilier/rabat/agdal", selector: '[data-p6-stage="vie-locale-detail"]' },
  { name: "listing-vivre-ici", href: "/visual-qa/announcement-page-living-here?state=context", selector: '[data-announcement-living-here="ann-l6"]', historicQaFixture: true },
  { name: "map-maarif", href: "/map?city=Casablanca&district=Ma%C3%A2rif&layer=explore", selector: '[data-p4-map-decision-rail]' },
];
const viewports = [
  { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
  { name: "768", width: 768, height: 900 },
  { name: "1280", width: 1280, height: 900 },
];

function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], { env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    let settled = false;
    const timeout = setTimeout(() => { if (!settled) { settled = true; child.kill("SIGTERM"); reject(new Error(`Next readiness timeout.\n${output}`)); } }, 30000);
    const onData = (chunk) => { const text = String(chunk); output += text; process.stdout.write(text); if (!settled && /Ready in|Local:\s+http/i.test(output)) { settled = true; clearTimeout(timeout); resolve(child); } };
    child.stdout.on("data", onData); child.stderr.on("data", onData);
    child.once("exit", (code) => { clearTimeout(timeout); if (!settled) { settled = true; reject(new Error(`Next exited ${code}.\n${output}`)); } });
  });
}
async function stopServer(child) { if (child.exitCode != null || child.signalCode != null) return; const exited = new Promise((resolve) => child.once("exit", resolve)); child.kill("SIGTERM"); await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 3000))]); }

const report = { schema: "NEIGHBORHOOD_CONTEXT_L5_BEFORE_ACTUAL_2026_11_V2", generated_at: new Date().toISOString(), base_head: process.env.GITHUB_SHA || null, expected_capture_count: states.length * viewports.length, captures: [], findings: [], scope: "November runtime homepage/SEO/listing historical fixture/map BEFORE; data read-only" };
const server = await startServer();
const browser = await chromium.launch({ headless: true });
try {
  for (const state of states) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const diagnostics = { pageErrors: [] };
      page.on("pageerror", (error) => diagnostics.pageErrors.push(String(error)));
      try {
        await page.goto(`${baseUrl}${state.href}`, { waitUntil: "domcontentloaded", timeout: 35000 });
        const target = page.locator(state.selector).first();
        await target.waitFor({ state: "visible", timeout: 25000 });
        if (state.name === "map-maarif") {
          await page.locator('[data-maplibre-spike][data-maplibre-city="casablanca"][data-maplibre-district="maarif"]').waitFor({ state: "visible", timeout: 20000 });
          await page.waitForFunction(() =>
            document.querySelector('[data-maplibre-spike][data-maplibre-city="casablanca"][data-maplibre-district="maarif"]')?.getAttribute("data-maplibre-render-state") === "ready",
            null, { timeout: 25000 },
          );
        }
        if (state.placement) {
          // Align the end of the cities grid at y~140: this is where the
          // future homepage section will be inserted. Same anchor in AFTER.
          await target.evaluate((node) => {
            const bottom = node.getBoundingClientRect().bottom + window.scrollY;
            window.scrollTo(0, Math.max(0, bottom - 140));
          });
        } else {
          await target.scrollIntoViewIfNeeded();
        }
        await page.waitForTimeout(400);
        const metrics = await page.evaluate(() => ({
          horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          contextPanels: document.querySelectorAll("[data-neighborhood-context-converged]").length,
          homeNeighborhoodCards: document.querySelectorAll("[data-home-neighborhood-card]").length,
          pageH1: document.querySelector("h1")?.textContent?.trim().slice(0, 120) ?? null,
        }));
        if (diagnostics.pageErrors.length) report.findings.push(`${state.name}/${viewport.name}:page_error`);
        if (metrics.horizontalOverflow > 1) report.findings.push(`${state.name}/${viewport.name}:overflow:${metrics.horizontalOverflow}`);
        if (state.name === "homepage" && metrics.homeNeighborhoodCards !== 0)
          report.findings.push(`${state.name}/${viewport.name}:homepage_already_mounted`);
        const file = `${state.name}-${viewport.name}-before.png`;
        await page.screenshot({ path: `${outDir}/${file}`, fullPage: false, animations: "disabled" });
        report.captures.push({ state: state.name, viewport: viewport.name, file, ...metrics, historicQaFixture: !!state.historicQaFixture, diagnostics });
      } catch (error) {
        report.findings.push(`${state.name}/${viewport.name}:capture_failed:${String(error)}`);
        try {
          await page.screenshot({ path: `${outDir}/${state.name}-${viewport.name}-failure.png`, fullPage: false });
        } catch {}
      } finally { await page.close(); }
    }
  }
} finally { await browser.close(); await stopServer(server); }
report.ok = report.captures.length === report.expected_capture_count && report.findings.length === 0;
await writeFile(`${outDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, "utf8");
if (!report.ok) throw new Error(`L5 BEFORE failed: ${JSON.stringify(report.findings)}`);
console.log(`L5 CURRENT BEFORE PASS: ${report.captures.length}/${report.expected_capture_count} captures, 0 findings.`);
