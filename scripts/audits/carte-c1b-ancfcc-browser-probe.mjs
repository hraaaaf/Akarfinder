import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const targetUrl = "https://www.ancfcc.gov.ma/TestGVV_Principal";
const outDir = "data/audits/runtime/carte-c1b-ancfcc-browser-probe";
const reportPath = `${outDir}/report.json`;
const screenshotPath = `${outDir}/page.png`;

await mkdir(outDir, { recursive: true });

const report = {
  generated_at: new Date().toISOString(),
  mode: "read_only_browser_probe",
  target_url: targetUrl,
  navigation: null,
  final_url: null,
  title: null,
  body_excerpt: null,
  forms: [],
  selects: [],
  links: [],
  scripts: [],
  network: [],
  request_failures: [],
  performance_resources: [],
  screenshot: null,
  verdict: "UNKNOWN",
};

const interesting = (url) => /ancfcc|gvv|zone|zoning|geo|map|cart|api|json|wms|wfs|arcgis|leaflet|openlayers/i.test(url);

const browser = await chromium.launch({
  headless: true,
  args: ["--disable-blink-features=AutomationControlled"],
});

try {
  const context = await browser.newContext({
    locale: "fr-FR",
    viewport: { width: 1440, height: 1000 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    extraHTTPHeaders: {
      "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    },
  });

  const page = await context.newPage();

  page.on("requestfailed", (request) => {
    report.request_failures.push({
      url: request.url(),
      resource_type: request.resourceType(),
      failure: request.failure()?.errorText ?? null,
    });
  });

  page.on("response", async (response) => {
    const request = response.request();
    const resourceType = request.resourceType();
    const url = response.url();
    if (!["document", "xhr", "fetch"].includes(resourceType) && !interesting(url)) return;

    report.network.push({
      url,
      status: response.status(),
      resource_type: resourceType,
      content_type: response.headers()["content-type"] ?? null,
    });
  });

  try {
    const navigationResponse = await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    report.navigation = {
      ok: navigationResponse?.ok() ?? false,
      status: navigationResponse?.status() ?? null,
      status_text: navigationResponse?.statusText() ?? null,
    };

    await page.waitForTimeout(7_000);
    report.final_url = page.url();
    report.title = await page.title().catch(() => null);

    report.body_excerpt = (
      await page.locator("body").innerText().catch(() => "")
    ).slice(0, 20_000);

    report.forms = await page.locator("form").evaluateAll((forms) =>
      forms.slice(0, 20).map((form) => ({
        id: form.id || null,
        name: form.getAttribute("name"),
        method: form.getAttribute("method"),
        action: form.getAttribute("action"),
      })),
    );

    report.selects = await page.locator("select").evaluateAll((selects) =>
      selects.slice(0, 30).map((select) => ({
        id: select.id || null,
        name: select.getAttribute("name"),
        aria_label: select.getAttribute("aria-label"),
        options: Array.from(select.options)
          .slice(0, 120)
          .map((option) => ({
            text: option.textContent?.trim() ?? "",
            value: option.value,
            selected: option.selected,
          })),
      })),
    );

    report.links = await page.locator("a[href]").evaluateAll((links) =>
      links
        .slice(0, 300)
        .map((link) => ({
          text: link.textContent?.trim().replace(/\s+/g, " ").slice(0, 200) ?? "",
          href: link.href,
        }))
        .filter((entry) => entry.href),
    );

    report.scripts = await page.locator("script[src]").evaluateAll((scripts) =>
      scripts.slice(0, 200).map((script) => script.src),
    );

    report.performance_resources = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter(Boolean)
        .slice(0, 500),
    );

    await page.screenshot({ path: screenshotPath, fullPage: true });
    report.screenshot = screenshotPath;

    const allUrls = [
      ...report.network.map((entry) => entry.url),
      ...report.performance_resources,
      ...report.links.map((entry) => entry.href),
      ...report.scripts,
    ];
    const candidateUrls = allUrls.filter(interesting);

    if (report.navigation?.status === 403) {
      report.verdict = "ANCFCC_BROWSER_BLOCKED_403";
    } else if (!report.navigation?.ok) {
      report.verdict = "ANCFCC_BROWSER_NAVIGATION_FAILED";
    } else if (candidateUrls.some((url) => /api|json|wms|wfs|geo|map|zone|zoning/i.test(url))) {
      report.verdict = "ANCFCC_BROWSER_DISCOVERY_CANDIDATES_FOUND";
    } else if (report.selects.length > 0 || report.forms.length > 0) {
      report.verdict = "ANCFCC_BROWSER_SERVER_RENDERED_WORKFLOW_FOUND";
    } else {
      report.verdict = "ANCFCC_BROWSER_LOADED_NO_GEOMETRY_ENDPOINT_FOUND";
    }
  } catch (error) {
    report.navigation = {
      ok: false,
      status: null,
      error: String(error),
    };
    report.verdict = "ANCFCC_BROWSER_EXCEPTION";
  }
} finally {
  await browser.close();
}

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
