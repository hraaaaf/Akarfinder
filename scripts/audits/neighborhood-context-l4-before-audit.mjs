import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const port = 3211;
const baseUrl = `http://127.0.0.1:${port}`;
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/neighborhood-context-l4-before";
await mkdir(outDir, { recursive: true });

const states = [
  { name: "national", href: "/map?layer=explore" },
  { name: "rabat-city", href: "/map?city=rabat&layer=explore" },
  { name: "rabat-agdal", href: "/map?city=rabat&district=agdal&layer=explore" },
  { name: "casablanca-maarif", href: "/map?city=casablanca&district=maarif&layer=explore" },
];
const viewports = [
  { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
  { name: "768", width: 768, height: 900 },
  { name: "1280", width: 1280, height: 900 },
];

function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
      {
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
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
  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
}

const report = {
  schema: "NEIGHBORHOOD_CONTEXT_L4_BEFORE_V1",
  generated_at: new Date().toISOString(),
  base_head: process.env.GITHUB_SHA || null,
  expected_capture_count: states.length * viewports.length,
  captures: [],
  findings: [],
};

const server = await startServer();
const browser = await chromium.launch({ headless: true });
try {
  for (const state of states) {
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
        await page.getByText("Chargement de la carte…", { exact: true }).waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});
        await page.locator(".maplibregl-canvas").waitFor({ state: "visible", timeout: 20000 });
        await page.waitForTimeout(900);
        const metrics = await page.evaluate(() => ({
          horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          nationalShell: document.querySelectorAll("[data-akarfinder-national-map]").length,
          marketShell: document.querySelectorAll("[data-akarfinder-market-intelligence-map]").length,
          genericShell: document.querySelectorAll('[data-akarfinder-generic-map-shell="true"]').length,
          l4PoiMarkers: document.querySelectorAll("[data-neighborhood-context-poi]").length,
          l4PoiToggle: document.querySelectorAll("[data-neighborhood-context-poi-toggle]").length,
        }));
        if (diagnostics.pageErrors.length) report.findings.push(`${state.name}/${viewport.name}:page_error`);
        if (metrics.horizontalOverflow > 1) report.findings.push(`${state.name}/${viewport.name}:overflow:${metrics.horizontalOverflow}`);
        if (metrics.nationalShell + metrics.marketShell + metrics.genericShell < 1) report.findings.push(`${state.name}/${viewport.name}:unknown_map_shell`);
        if (metrics.l4PoiMarkers !== 0 || metrics.l4PoiToggle !== 0) report.findings.push(`${state.name}/${viewport.name}:l4_ui_present_before_implementation`);
        const file = `${state.name}-${viewport.name}-before.png`;
        await page.screenshot({ path: `${outDir}/${file}`, fullPage: false });
        report.captures.push({ state: state.name, viewport: viewport.name, file, ...metrics, diagnostics });
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
  await stopServer(server);
}

report.ok = report.captures.length === report.expected_capture_count && report.findings.length === 0;
await writeFile(`${outDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, "utf8");
if (!report.ok) throw new Error(`L4 BEFORE failed: ${JSON.stringify(report.findings)}`);
console.log(`L4 BEFORE PASS: ${report.captures.length}/${report.expected_capture_count} captures, 0 findings.`);
