import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const TARGET_URL = "https://www.ancfcc.gov.ma/TestGVVPage/";
const OUT_DIR = "data/audits/runtime/carte-c1c-ancfcc-consultation-probe";

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1200 },
  locale: "fr-FR",
});
const page = await context.newPage();

const network = [];
const requestFailures = [];
const phases = [];

page.on("response", async (response) => {
  const request = response.request();
  const headers = await response.allHeaders().catch(() => ({}));
  network.push({
    url: response.url(),
    status: response.status(),
    resource_type: request.resourceType(),
    method: request.method(),
    content_type: headers["content-type"] ?? null,
  });
});

page.on("requestfailed", (request) => {
  requestFailures.push({
    url: request.url(),
    method: request.method(),
    resource_type: request.resourceType(),
    failure: request.failure()?.errorText ?? null,
  });
});

async function inspectPhase(name) {
  await page.waitForTimeout(700);
  const snapshot = await page.evaluate(() => {
    const normalize = (value) => (value ?? "").replace(/\s+/g, " ").trim();
    const selects = [...document.querySelectorAll("select")].map((el) => ({
      id: el.id || null,
      name: el.getAttribute("name"),
      value: el.value,
      disabled: el.disabled,
      options: [...el.options].slice(0, 250).map((option) => ({
        value: option.value,
        text: normalize(option.textContent),
        selected: option.selected,
        disabled: option.disabled,
      })),
    }));
    const inputs = [...document.querySelectorAll("input")].map((el) => ({
      id: el.id || null,
      name: el.getAttribute("name"),
      type: el.type,
      value: el.type === "hidden" ? el.value.slice(0, 160) : el.value,
      placeholder: el.getAttribute("placeholder"),
      disabled: el.disabled,
    }));
    const buttons = [...document.querySelectorAll("button, input[type='submit'], input[type='button']")].map((el) => ({
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      name: el.getAttribute("name"),
      type: el.getAttribute("type"),
      text: normalize(el.textContent || el.getAttribute("value")),
      disabled: el.disabled,
    }));
    const forms = [...document.querySelectorAll("form")].map((form) => ({
      id: form.id || null,
      name: form.getAttribute("name"),
      method: (form.getAttribute("method") || "GET").toUpperCase(),
      action: form.getAttribute("action"),
    }));
    const iframes = [...document.querySelectorAll("iframe")].map((frame) => ({
      id: frame.id || null,
      name: frame.getAttribute("name"),
      src: frame.getAttribute("src"),
      title: frame.getAttribute("title"),
    }));
    const scripts = [...document.scripts].map((script) => ({
      src: script.src || null,
      inline: script.src ? null : (script.textContent || "").slice(0, 12000),
    }));
    return {
      title: document.title,
      url: location.href,
      body_excerpt: normalize(document.body?.innerText).slice(0, 12000),
      selects,
      inputs,
      buttons,
      forms,
      iframes,
      scripts,
    };
  });
  phases.push({ name, ...snapshot });
  return snapshot;
}

function hasRabat(option) {
  return /(^|\b)rabat(\b|$)/i.test(option.text || "") || /(^|\b)rabat(\b|$)/i.test(option.value || "");
}

let navigation = { ok: false, status: null, status_text: null };
let error = null;

try {
  const response = await page.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 45000 });
  navigation = {
    ok: Boolean(response?.ok()),
    status: response?.status() ?? null,
    status_text: response?.statusText() ?? null,
  };

  let snapshot = await inspectPhase("initial");

  // Read-only interaction: if a select explicitly exposes Rabat, select it and
  // capture whatever dependent controls/network calls the public app reveals.
  for (let round = 0; round < 4; round += 1) {
    let changed = false;
    for (const select of snapshot.selects) {
      const rabatOption = select.options.find((option) => hasRabat(option) && !option.disabled);
      if (!rabatOption || select.value === rabatOption.value || !select.id) continue;
      try {
        await page.selectOption(`#${CSS.escape(select.id)}`, rabatOption.value);
        await page.waitForTimeout(1200);
        await inspectPhase(`select-rabat-${select.id}-${round + 1}`);
        changed = true;
        break;
      } catch {
        // Keep discovery fail-soft. The evidence captures the control even if
        // the site binds a non-standard client handler.
      }
    }
    if (!changed) break;
    snapshot = phases.at(-1);
  }

  await page.screenshot({ path: `${OUT_DIR}/page.png`, fullPage: true });
  await writeFile(`${OUT_DIR}/page.html`, await page.content(), "utf8");
} catch (caught) {
  error = String(caught);
}

const candidatePattern = /(TestGVV|valeur|venale|zone|zoning|province|prefecture|commune|quartier|district|map|geo|shape|polygon|wms|wfs|arcgis|feature|layer)/i;
const candidateUrls = [...new Set(network.map((entry) => entry.url).filter((url) => candidatePattern.test(url)))];
const inlineCandidates = phases
  .flatMap((phase) => phase.scripts || [])
  .filter((script) => script.inline && candidatePattern.test(script.inline))
  .map((script) => script.inline)
  .slice(0, 20);

const report = {
  generated_at: new Date().toISOString(),
  mode: "read_only_browser_probe",
  target_url: TARGET_URL,
  navigation,
  error,
  phases,
  candidate_urls: candidateUrls,
  inline_script_candidates: inlineCandidates,
  network,
  request_failures: requestFailures,
  screenshot: `${OUT_DIR}/page.png`,
  html: `${OUT_DIR}/page.html`,
  verdict: !navigation.ok
    ? "C1C_ANCFCC_CONSULTATION_UNREACHABLE"
    : candidateUrls.length || inlineCandidates.length
      ? "C1C_ANCFCC_CONSULTATION_CANDIDATES_FOUND"
      : "C1C_ANCFCC_CONSULTATION_FORM_ONLY",
};

await writeFile(`${OUT_DIR}/report.json`, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));

await browser.close();
if (!navigation.ok) process.exitCode = 2;
