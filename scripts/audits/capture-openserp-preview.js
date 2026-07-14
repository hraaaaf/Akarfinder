const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = process.env.OPENSERP_PREVIEW_URL;
if (!baseUrl || !/^https:\/\//.test(baseUrl)) {
  throw new Error("Set OPENSERP_PREVIEW_URL to the HTTPS Preview URL.");
}

const outputDir = path.resolve("data/audits/openserp-first-write-display-remediation-1");
fs.mkdirSync(outputDir, { recursive: true });

const cityRoutes = [
  { city: "casablanca", path: "/search?q=appartement%20casablanca" },
  { city: "rabat", path: "/search?q=appartement%20rabat" },
  { city: "marrakech", path: "/search?q=appartement%20marrakech" },
];
const smokeRoutes = ["/acheter", "/louer", "/neuf"];
const viewports = [
  { name: "desktop-1440", width: 1440, height: 1000 },
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-375", width: 375, height: 812 },
];
const forbiddenWording = [
  "annonce fiable",
  "annonce vérifiée",
  "toujours disponible",
  "encore disponible",
  "source certifiée",
  "score de fiabilité",
  "meilleure annonce",
];
const piiPatterns = [
  /\+212\s?\d/i,
  /0[5-7]\d{8}/,
  /whatsapp/i,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
];

function safeExternalHref(href) {
  try {
    const url = new URL(href);
    return (url.protocol === "https:" || url.protocol === "http:") &&
      url.hostname.length > 0 &&
      !url.hostname.endsWith("vercel.app") &&
      !url.hostname.includes("localhost");
  } catch {
    return false;
  }
}

async function inspectRoute(browser, route, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  const consoleErrors = [];
  const pageErrors = [];
  const requestFailures = [];
  const badResponses = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? "failed"}`));
  page.on("response", (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });

  const response = await page.goto(`${baseUrl}${route.path}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(500);
  const pageAudit = await page.evaluate((forbidden, patterns) => {
    const bodyText = document.body.innerText.toLowerCase();
    const externalBadgeText = "résultat web externe";
    const links = Array.from(document.querySelectorAll("a[href]")).map((anchor) => ({
      href: anchor.href,
      text: (anchor.textContent || "").trim(),
      target: anchor.target,
      rel: anchor.rel,
    }));
    const externalLinks = links.filter((link) => /^https?:\/\//.test(link.href) && !link.href.includes(location.hostname));
    const images = Array.from(document.images).map((image) => ({ src: image.getAttribute("src") || "", complete: image.complete, naturalWidth: image.naturalWidth }));
    return {
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      externalBadgeCount: (bodyText.match(new RegExp(externalBadgeText, "g")) || []).length,
      partnerBadgeOnExternalText: bodyText.includes("partenaire premium"),
      internalListingLinks: links.filter((link) => new URL(link.href).pathname.startsWith("/listings/")).length,
      externalLinks,
      invalidImageCount: images.filter((image) => !image.src || (image.complete && image.naturalWidth === 0)).length,
      imageCount: images.length,
      forbiddenWordingHits: forbidden.filter((word) => bodyText.includes(word)),
      piiHitCount: patterns.filter((pattern) => new RegExp(pattern, "i").test(bodyText)).length,
    };
  }, forbiddenWording, piiPatterns.map((pattern) => pattern.source));

  const fileName = `${viewport.name}-${route.city || route.path.replaceAll("/", "_")}.png`;
  await page.screenshot({ path: path.join(outputDir, fileName), fullPage: true });
  await page.close();
  return {
    route: route.path,
    city: route.city || null,
    viewport: viewport.name,
    status: response?.status() ?? null,
    screenshot: fileName,
    ...pageAudit,
    externalLinksSafe: pageAudit.externalLinks.every((link) => safeExternalHref(link.href) && link.target === "_blank" && link.rel.includes("noopener")),
    consoleErrors,
    pageErrors,
    requestFailures,
    badResponses,
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const captures = [];
    for (const viewport of viewports) {
      for (const route of cityRoutes) captures.push(await inspectRoute(browser, route, viewport));
    }
    for (const route of smokeRoutes) captures.push(await inspectRoute(browser, { path: route }, viewports[0]));

    const cityCaptures = captures.filter((capture) => capture.city);
    const report = {
      preview_url: baseUrl,
      generated_at: new Date().toISOString(),
      captures,
      summary: {
        city_routes_with_external_badge: [...new Set(cityCaptures.filter((capture) => capture.externalBadgeCount > 0).map((capture) => capture.city))],
        horizontal_overflow: cityCaptures.some((capture) => capture.horizontalOverflow),
        internal_listing_links_on_city_search: cityCaptures.reduce((total, capture) => total + capture.internalListingLinks, 0),
        invalid_images: cityCaptures.reduce((total, capture) => total + capture.invalidImageCount, 0),
        forbidden_wording_hits: cityCaptures.flatMap((capture) => capture.forbiddenWordingHits),
        pii_hits: cityCaptures.reduce((total, capture) => total + capture.piiHitCount, 0),
        console_errors: captures.flatMap((capture) => capture.consoleErrors),
        page_errors: captures.flatMap((capture) => capture.pageErrors),
        request_failures: captures.flatMap((capture) => capture.requestFailures),
        bad_responses: captures.flatMap((capture) => capture.badResponses),
      },
    };
    fs.writeFileSync(path.join(outputDir, "visual-network-console-report.json"), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report.summary, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
