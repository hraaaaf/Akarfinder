import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const port = 3213;
const baseUrl = `http://127.0.0.1:${port}`;
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/neighborhood-context-l5-after";
const expectedCanonicalId = "district_rabat_agdal";
await mkdir(outDir, { recursive: true });

const states = [
  { name: "homepage", href: "/", selector: `[data-home-neighborhood-card][data-neighborhood-context-converged="${expectedCanonicalId}"]` },
  { name: "seo-rabat-agdal", href: "/immobilier/rabat/agdal", selector: `[data-p6-stage="vie-locale-detail"] [data-neighborhood-context-converged="${expectedCanonicalId}"]` },
  { name: "quartier-rabat-agdal", href: "/quartiers/rabat/agdal", selector: `[data-neighborhood-context-converged="${expectedCanonicalId}"]` },
  { name: "listing-vivre-ici", href: "/visual-qa/announcement-page-living-here?state=exact", selector: `[data-announcement-living-here="ann-l6"] [data-neighborhood-context-surface="nci"][data-neighborhood-context-converged="${expectedCanonicalId}"]` },
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
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill("SIGTERM");
        reject(new Error(`Next readiness timeout.\n${output}`));
      }
    }, 30000);
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
        reject(new Error(`Next exited ${code}.\n${output}`));
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

const report = {
  schema: "NEIGHBORHOOD_CONTEXT_L5_AFTER_V1",
  generated_at: new Date().toISOString(),
  head: process.env.GITHUB_SHA || null,
  expected_capture_count: states.length * viewports.length,
  expected_canonical_id: expectedCanonicalId,
  captures: [],
  signatures: {},
  findings: [],
};

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
        await target.scrollIntoViewIfNeeded();
        await page.waitForTimeout(800);

        const pageMetrics = await page.evaluate(() => ({
          horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }));
        const evidence = await target.evaluate((element) => {
          const text = element.textContent ?? "";
          const interactive = Array.from(element.querySelectorAll("a,button"))
            .filter((node) => !node.closest(".maplibregl-ctrl"))
            .map((node) => {
              const rect = node.getBoundingClientRect();
              return { tag: node.tagName, width: rect.width, height: rect.height, text: node.textContent?.trim().slice(0, 80) ?? "" };
            });
          return {
            canonicalId: element.getAttribute("data-neighborhood-context-converged"),
            coverage: element.getAttribute("data-neighborhood-context-coverage"),
            anchorCount: Number(element.getAttribute("data-neighborhood-context-anchor-count") ?? "0"),
            poiIds: (element.getAttribute("data-neighborhood-context-poi-ids") ?? "").split(",").filter(Boolean),
            text,
            interactive,
          };
        });

        let exactMeasurementEvidence = null;
        if (state.name === "listing-vivre-ici") {
          const exactMeasurements = page.locator('[data-announcement-living-here="ann-l6"] [data-exact-property-measurements="ann-l6"]').first();
          if (await exactMeasurements.count() === 0) {
            report.findings.push(`${state.name}/${viewport.name}:exact_measurements_missing`);
          } else {
            await exactMeasurements.waitFor({ state: "visible", timeout: 5000 });
            const exactText = await exactMeasurements.textContent() ?? "";
            const exactPoiIds = await exactMeasurements.locator("[data-exact-property-measurement-poi]").evaluateAll((nodes) =>
              nodes.map((node) => node.getAttribute("data-exact-property-measurement-poi")).filter(Boolean),
            );
            exactMeasurementEvidence = { text: exactText.slice(0, 500), poiIds: exactPoiIds };
            if (!/Depuis ce bien exact/i.test(exactText)) report.findings.push(`${state.name}/${viewport.name}:exact_label_missing`);
            if (!/\d+\s*min\s+(?:à pied|en voiture)/i.test(exactText)) report.findings.push(`${state.name}/${viewport.name}:exact_route_time_missing`);
          }
        }

        const key = `${state.name}/${viewport.name}`;
        if (diagnostics.pageErrors.length) report.findings.push(`${key}:page_error`);
        if (pageMetrics.horizontalOverflow > 1) report.findings.push(`${key}:overflow:${pageMetrics.horizontalOverflow}`);
        if (evidence.canonicalId !== expectedCanonicalId) report.findings.push(`${key}:canonical_id:${evidence.canonicalId}`);
        if (evidence.coverage !== "covered") report.findings.push(`${key}:coverage:${evidence.coverage}`);
        if (evidence.anchorCount !== 5) report.findings.push(`${key}:anchor_count:${evidence.anchorCount}`);
        if (evidence.poiIds.length !== 5) report.findings.push(`${key}:poi_ids:${evidence.poiIds.length}`);
        if (/\b(?:premium|calme|familial)\b/i.test(evidence.text)) report.findings.push(`${key}:subjective_truth_wording`);
        if (/Dans le quartier/i.test(evidence.text)) report.findings.push(`${key}:false_inside_wording`);
        if (state.name === "listing-vivre-ici" && /\d+\s*min\s+(?:à pied|en voiture)/i.test(evidence.text)) report.findings.push(`${key}:nci_route_time_leak`);
        for (const item of evidence.interactive) {
          if (item.width > 0 && item.height > 0 && (item.width < 44 || item.height < 44)) {
            report.findings.push(`${key}:small_control:${item.tag}:${Math.round(item.width)}x${Math.round(item.height)}:${item.text}`);
          }
        }

        const signature = evidence.poiIds.join("|");
        if (!report.signatures[state.name]) report.signatures[state.name] = signature;
        if (report.signatures[state.name] !== signature) report.findings.push(`${key}:unstable_signature`);

        const file = `${state.name}-${viewport.name}-after.png`;
        await page.screenshot({ path: `${outDir}/${file}`, fullPage: false });
        report.captures.push({ state: state.name, viewport: viewport.name, file, ...pageMetrics, evidence: { ...evidence, text: evidence.text.slice(0, 500), exactMeasurements: exactMeasurementEvidence }, diagnostics });
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
  await stopServer(server);
}

const uniqueSignatures = new Set(Object.values(report.signatures));
if (uniqueSignatures.size !== 1) report.findings.push(`cross_surface_signature_mismatch:${JSON.stringify(report.signatures)}`);
report.ok = report.captures.length === report.expected_capture_count && report.findings.length === 0;
await writeFile(`${outDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, "utf8");
if (!report.ok) throw new Error(`L5 AFTER failed: ${JSON.stringify(report.findings)}`);
console.log(`L5 AFTER PASS: ${report.captures.length}/${report.expected_capture_count} captures, one Agdal POI signature, exact-route separation, 0 findings.`);
