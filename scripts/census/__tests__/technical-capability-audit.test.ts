import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTechnicalAudit,
  chooseConnectorFamily,
  detectAccessControl,
  detectCmsFamily,
  extractJsonLdSchemaTypes,
  extractSitemapSignals,
  isRobotsPathAllowed,
  parseRobots,
  robotsDisallowAll,
  validateCandidateSeed,
  type CandidateSeed,
  type HttpEvidence,
} from "../technical-capability-audit";

const seed: CandidateSeed = {
  rank: 2,
  domain: "example.ma",
  class: "PRIMARY_SOURCE_CANDIDATE",
  reviewPriority: 87,
  b3Urls: 20,
  ccSignalPages: 100,
  ccIndexedPages: 120,
  registry: false,
};

const evidence = (url: string, status = 200, contentType = "text/html"): HttpEvidence => ({
  requestedUrl: url,
  finalUrl: url,
  status,
  contentType,
  bytesRead: 100,
  truncated: false,
  error: null,
});

test("robots parser enforces block-all and preserves sitemap evidence", () => {
  const parsed = parseRobots(`
User-agent: *
Disallow: /
Sitemap: https://example.ma/sitemap.xml
`);
  assert.equal(robotsDisallowAll(parsed), true);
  assert.equal(isRobotsPathAllowed(parsed, "/property/1"), false);
  assert.deepEqual(parsed.sitemapUrls, ["https://example.ma/sitemap.xml"]);
});

test("robots longest match lets a more specific allow override a broader disallow", () => {
  const parsed = parseRobots(`
User-agent: *
Disallow: /private/
Allow: /private/public/
`);
  assert.equal(isRobotsPathAllowed(parsed, "/private/secret"), false);
  assert.equal(isRobotsPathAllowed(parsed, "/private/public/listing"), true);
  assert.equal(isRobotsPathAllowed(parsed, "/property/1"), true);
});

test("detects Houzez before generic WordPress", () => {
  const html = `<html><head><meta name="generator" content="WordPress 6"><link href="/wp-content/themes/houzez/css/main.css"></head></html>`;
  assert.equal(detectCmsFamily(html), "HOUZEZ");
});

test("detects RealHomes and does not confuse generic structured HTML with WordPress", () => {
  assert.equal(detectCmsFamily(`<script src="/wp-content/themes/realhomes/assets/app.js"></script>`), "REALHOMES");
  assert.equal(detectCmsFamily(`<html><body><a href="/properties/villa-1">Villa</a></body></html>`), "CUSTOM");
});

test("embedded security/CDN assets are not mistaken for page-level access control", () => {
  const normal = `<html><head><title>Agence immobilière</title><script src="https://cdnjs.cloudflare.com/ajax/libs/app.js"></script></head><body><form><div class="g-recaptcha">Captcha</div></form><script>const forbiddenMessage = 'forbidden';</script><a href="/property/villa">Villa</a></body></html>`;
  const challenge = `<html><title>Attention Required! | Cloudflare</title><div id="cf-chl-widget">Verify you are human</div></html>`;
  assert.equal(detectAccessControl(normal, "https://example.ma/"), false);
  assert.equal(detectAccessControl(challenge, "https://example.ma/"), true);
});

test("login redirects remain access-control evidence", () => {
  assert.equal(detectAccessControl(`<html><title>Connexion</title></html>`, "https://example.ma/login"), true);
});

test("extracts JSON-LD schema types recursively", () => {
  const html = `<script type="application/ld+json">{"@graph":[{"@type":"Organization"},{"@type":["Offer","House"]}]}</script>`;
  assert.deepEqual(extractJsonLdSchemaTypes(html), ["House", "Offer", "Organization"]);
});

test("sitemap signals count listing-like URLs and freshness", () => {
  const signals = extractSitemapSignals(`<?xml version="1.0"?><urlset>
<url><loc>https://example.ma/property/villa-1</loc><lastmod>2026-08-01</lastmod></url>
<url><loc>https://example.ma/contact</loc><lastmod>2026-07-01</lastmod></url>
</urlset>`);
  assert.equal(signals.locCount, 2);
  assert.equal(signals.listingLocCount, 1);
  assert.equal(signals.latestLastmod, "2026-08-01T00:00:00.000Z");
});

test("Houzez capability remains a connector candidate, never a policy", () => {
  const robotsBody = `User-agent: *\nAllow: /\nSitemap: https://example.ma/sitemap.xml`;
  const audit = buildTechnicalAudit({
    seed,
    generatedAt: "2026-08-07T12:00:00Z",
    requestCount: 4,
    robotsEvidence: evidence("https://example.ma/robots.txt", 200, "text/plain"),
    robotsStatus: "PRESENT",
    parsedRobots: parseRobots(robotsBody),
    homepageEvidence: evidence("https://example.ma/"),
    homepageHtml: `<html><head><link rel="https://api.w.org/" href="https://example.ma/wp-json/"><script src="/wp-content/themes/houzez/js/app.js"></script><script type="application/ld+json">{"@type":"House"}</script></head><body><a href="/property/villa-1">Villa</a></body></html>`,
    sitemapEvidence: [evidence("https://example.ma/sitemap.xml", 200, "application/xml")],
    sitemapBodies: [`<urlset><url><loc>https://example.ma/property/villa-1</loc></url></urlset>`],
    wpJsonEvidence: evidence("https://example.ma/wp-json/", 200, "application/json"),
    wpJsonBody: JSON.stringify({ routes: { "/": {}, "/wp/v2": {} } }),
  });
  assert.equal(audit.cms, "HOUZEZ");
  assert.equal(audit.connectorFamilyCandidate, "WORDPRESS_HOUZEZ");
  assert.equal(audit.technicalGate, "CAPABILITY_REVIEW_READY");
  assert.equal(audit.effectivePolicyCandidate, null);
  assert.ok(audit.capabilityScore >= 80);
});

test("noindex is review-only even when technical capability is strong", () => {
  const audit = buildTechnicalAudit({
    seed,
    generatedAt: "2026-08-07T12:00:00Z",
    requestCount: 3,
    robotsEvidence: evidence("https://example.ma/robots.txt", 404, "text/plain"),
    robotsStatus: "MISSING",
    parsedRobots: null,
    homepageEvidence: evidence("https://example.ma/"),
    homepageHtml: `<html><head><meta name="robots" content="noindex,follow"></head><body><a href="/property/1">One</a></body></html>`,
    sitemapEvidence: [],
    sitemapBodies: [],
    wpJsonEvidence: null,
    wpJsonBody: "",
  });
  assert.equal(audit.technicalGate, "REVIEW_ONLY_NOINDEX");
  assert.equal(audit.effectivePolicyCandidate, null);
});

test("robots block-all cannot yield an automated connector evaluation", () => {
  const gateConnector = chooseConnectorFamily({
    gate: "REVIEW_ONLY_ROBOTS_BLOCK",
    cms: "HOUZEZ",
    wpJsonPublic: true,
    explicitFeedCount: 1,
    explicitRestCount: 1,
    sitemapLocCount: 100,
    listingLocCount: 90,
    listingLinkCount: 20,
    schemaTypes: ["House"],
  });
  assert.equal(gateConnector, "BLOCKED_OR_INACCESSIBLE");
});

test("seed validation rejects registered or duplicate sources", () => {
  assert.throws(() => validateCandidateSeed([{ ...seed, registry: true } as unknown as CandidateSeed]), /exclude registered/);
  assert.throws(() => validateCandidateSeed([seed, seed]), /Duplicate/);
});
