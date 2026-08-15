import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const HOME_URL = "https://www.ancfcc.gov.ma/fr";
const OUT_DIR = "data/audits/runtime/carte-c1c-ancfcc-consultation-probe";
const SERVICE_LABEL = /Référentiel\s+Commun\s+des\s+Prix/i;
const CANDIDATE_PATTERN = /(referentiel|prix|price|rcp|gvv|venale|valeur|zone|zoning|province|prefecture|commune|quartier|district|map|geo|shape|polygon|wms|wfs|arcgis|feature|layer)/i;

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
    return {
      title: document.title,
      url: location.href,
      body_excerpt: normalize(document.body?.innerText).slice(0, 14000),
      anchors: [...document.querySelectorAll("a[href]")].map((el) => ({
        text: normalize(el.textContent),
        href: el.href,
        title: el.getAttribute("title"),
        onclick: el.getAttribute("onclick"),
      })),
      selects: [...document.querySelectorAll("select")].map((el) => ({
        id: el.id || null,
        name: el.getAttribute("name"),
        value: el.value,
        disabled: el.disabled,
        options: [...el.options].slice(0, 300).map((option) => ({
          value: option.value,
          text: normalize(option.textContent),
          selected: option.selected,
          disabled: option.disabled,
        })),
      })),
      inputs: [...document.querySelectorAll("input")].map((el) => ({
        id: el.id || null,
        name: el.getAttribute("name"),
        type: el.type,
        value: el.type === "hidden" ? el.value.slice(0, 180) : el.value,
        placeholder: el.getAttribute("placeholder"),
        disabled: el.disabled,
      })),
      buttons: [...document.querySelectorAll("button, input[type='submit'], input[type='button']")].map((el) => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        name: el.getAttribute("name"),
        type: el.getAttribute("type"),
        text: normalize(el.textContent || el.getAttribute("value")),
        onclick: el.getAttribute("onclick"),
        disabled: el.disabled,
      })),
      forms: [...document.querySelectorAll("form")].map((form) => ({
        id: form.id || null,
        name: form.getAttribute("name"),
        method: (form.getAttribute("method") || "GET").toUpperCase(),
        action: form.action || form.getAttribute("action"),
      })),
      iframes: [...document.querySelectorAll("iframe")].map((frame) => ({
        id: frame.id || null,
        name: frame.getAttribute("name"),
        src: frame.src || frame.getAttribute("src"),
        title: frame.getAttribute("title"),
      })),
      scripts: [...document.scripts].map((script) => ({
        src: script.src || null,
        inline: script.src ? null : (script.textContent || "").slice(0, 16000),
      })),
    };
  });
  phases.push({ name, ...snapshot });
  return snapshot;
}

function hasRabat(option) {
  return /(^|\b)rabat(\b|$)/i.test(option.text || "") || /(^|\b)rabat(\b|$)/i.test(option.value || "");
}

async function discoverServiceHref() {
  return page.evaluate(() => {
    const normalize = (value) => (value ?? "").replace(/\s+/g, " ").trim();
    const label = /Référentiel\s+Commun\s+des\s+Prix/i;
    const candidates = [];

    for (const element of document.querySelectorAll("body *")) {
      const ownText = normalize(element.textContent);
      if (!label.test(ownText) || ownText.length > 500) continue;

      let current = element;
      for (let depth = 0; current && depth < 6; depth += 1, current = current.parentElement) {
        const links = [...current.querySelectorAll("a[href]")].map((anchor) => ({
          href: anchor.href,
          text: normalize(anchor.textContent),
          title: anchor.getAttribute("title"),
          onclick: anchor.getAttribute("onclick"),
        }));
        if (current.matches?.("a[href]")) {
          links.unshift({
            href: current.href,
            text: normalize(current.textContent),
            title: current.getAttribute("title"),
            onclick: current.getAttribute("onclick"),
          });
        }
        if (links.length) {
          candidates.push({
            depth,
            container_text: normalize(current.textContent).slice(0, 700),
            links,
            html: current.outerHTML.slice(0, 5000),
          });
        }
      }
    }

    const flat = candidates.flatMap((entry) => entry.links.map((link) => ({ ...link, depth: entry.depth, container_text: entry.container_text })));
    const useful = flat.find((entry) => entry.href && entry.href !== location.href && !entry.href.endsWith("#") && !/javascript:/i.test(entry.href));
    return { candidates, selected: useful ?? null };
  });
}

let navigation = { ok: false, status: null, status_text: null };
let serviceDiscovery = { candidates: [], selected: null };
let serviceNavigation = null;
let error = null;

try {
  const response = await page.goto(HOME_URL, { waitUntil: "networkidle", timeout: 45000 });
  navigation = {
    ok: Boolean(response?.ok()),
    status: response?.status() ?? null,
    status_text: response?.statusText() ?? null,
  };

  await inspectPhase("home");
  await page.screenshot({ path: `${OUT_DIR}/home.png`, fullPage: true });
  serviceDiscovery = await discoverServiceHref();

  if (serviceDiscovery.selected?.href) {
    const serviceResponse = await page.goto(serviceDiscovery.selected.href, { waitUntil: "networkidle", timeout: 45000 });
    serviceNavigation = {
      requested_url: serviceDiscovery.selected.href,
      final_url: page.url(),
      ok: Boolean(serviceResponse?.ok()),
      status: serviceResponse?.status() ?? null,
      status_text: serviceResponse?.statusText() ?? null,
    };

    let snapshot = await inspectPhase("service-initial");

    // Public read-only interaction only: select an option explicitly labelled Rabat.
    for (let round = 0; round < 4; round += 1) {
      let changed = false;
      for (const select of snapshot.selects) {
        const rabatOption = select.options.find((option) => hasRabat(option) && !option.disabled);
        if (!rabatOption || select.value === rabatOption.value || !select.id) continue;
        const applied = await page.evaluate(({ id, value }) => {
          const element = document.getElementById(id);
          if (!(element instanceof HTMLSelectElement)) return false;
          element.value = value;
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
          return element.value === value;
        }, { id: select.id, value: rabatOption.value }).catch(() => false);
        if (!applied) continue;
        await page.waitForTimeout(1600);
        snapshot = await inspectPhase(`service-select-rabat-${select.id}-${round + 1}`);
        changed = true;
        break;
      }
      if (!changed) break;
    }

    await page.screenshot({ path: `${OUT_DIR}/service.png`, fullPage: true });
    await writeFile(`${OUT_DIR}/service.html`, await page.content(), "utf8");
  }
} catch (caught) {
  error = String(caught);
}

const candidateUrls = [...new Set(network.map((entry) => entry.url).filter((url) => CANDIDATE_PATTERN.test(url)))];
const inlineCandidates = phases
  .flatMap((phase) => phase.scripts || [])
  .filter((script) => script.inline && CANDIDATE_PATTERN.test(script.inline))
  .map((script) => script.inline)
  .slice(0, 30);

const report = {
  generated_at: new Date().toISOString(),
  mode: "read_only_browser_probe",
  home_url: HOME_URL,
  navigation,
  service_label_seen: phases.some((phase) => SERVICE_LABEL.test(phase.body_excerpt || "")),
  service_discovery: serviceDiscovery,
  service_navigation: serviceNavigation,
  error,
  phases,
  candidate_urls: candidateUrls,
  inline_script_candidates: inlineCandidates,
  network,
  request_failures: requestFailures,
  verdict: !navigation.ok
    ? "C1C_ANCFCC_HOME_UNREACHABLE"
    : !serviceDiscovery.selected?.href
      ? "C1C_RCP_SERVICE_LINK_NOT_RESOLVED"
      : serviceNavigation?.ok
        ? "C1C_RCP_SERVICE_REACHED"
        : "C1C_RCP_SERVICE_LINK_RESOLVED_BUT_UNREACHABLE",
};

await writeFile(`${OUT_DIR}/report.json`, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));

await browser.close();
if (!navigation.ok) process.exitCode = 2;
