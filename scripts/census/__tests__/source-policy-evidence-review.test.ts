import assert from "node:assert/strict";
import test from "node:test";

import { buildCandidateReconciliationReport } from "../candidate-reconciliation";
import type { TechnicalCapabilityAudit } from "../technical-capability-audit";
import {
  buildSourcePolicyEvidenceReview,
  classifyLegalEvidenceUrl,
  detectPolicySignals,
  extractSameSiteLegalLinks,
  standardLegalUrls,
  validateTechnicalAuditsForPolicyReview,
  type LegalEvidencePage,
} from "../source-policy-evidence-review";

function technicalAudit(overrides: Partial<TechnicalCapabilityAudit> = {}): TechnicalCapabilityAudit {
  return {
    seed: {
      rank: 2,
      domain: "example.ma",
      class: "PRIMARY_SOURCE_CANDIDATE",
      reviewPriority: 87,
      b3Urls: 20,
      ccSignalPages: 100,
      ccIndexedPages: 120,
      registry: false,
    },
    generatedAt: "2026-08-07T12:00:00.000Z",
    requestCount: 4,
    robots: {
      evidence: { requestedUrl: "https://example.ma/robots.txt", finalUrl: "https://example.ma/robots.txt", status: 200, contentType: "text/plain", bytesRead: 20, truncated: false, error: null },
      status: "PRESENT",
      disallowAll: false,
      sitemapUrls: [],
    },
    homepage: {
      evidence: { requestedUrl: "https://example.ma/", finalUrl: "https://example.ma/", status: 200, contentType: "text/html", bytesRead: 100, truncated: false, error: null },
      title: "Example",
      noindex: false,
      accessControlSignal: false,
      listingLinkCount: 10,
      explicitFeedUrls: [],
      explicitRestUrls: [],
    },
    sitemaps: { fetched: [], locCount: 20, listingLocCount: 10, latestLastmod: null },
    structuredData: { hasJsonLd: true, schemaTypes: ["RealEstateListing"] },
    cms: "WORDPRESS",
    wpJson: { evidence: null, public: true, routeCount: 10 },
    capabilityScore: 95,
    connectorFamilyCandidate: "WORDPRESS_GENERIC",
    technicalGate: "CAPABILITY_REVIEW_READY",
    effectivePolicyCandidate: null,
    ...overrides,
  };
}

function legalPage(signalIds: string[] = [], options: Partial<LegalEvidencePage> = {}): LegalEvidencePage {
  return {
    requestedUrl: "https://example.ma/cgu/",
    finalUrl: "https://example.ma/cgu/",
    status: 200,
    contentType: "text/html",
    bytesRead: 500,
    bodySha256: "a".repeat(64),
    source: "HOMEPAGE_LINK",
    signalIds,
    error: null,
    ...options,
  };
}

function reviewInput(legalPages: LegalEvidencePage[]) {
  return {
    technicalAudit: technicalAudit(),
    generatedAt: "2026-08-07T13:00:00.000Z",
    requestCount: 3,
    robots: { status: "PRESENT" as const, disallowAll: false, evidenceUrl: "https://example.ma/robots.txt" },
    homepage: { status: 200, noindex: false, accessControlSignal: false, evidenceUrl: "https://example.ma/", error: null },
    legalPages,
  };
}

test("reconciliation import remains usable alongside policy review tests", () => {
  const report = buildCandidateReconciliationReport({
    generatedAt: "2026-08-07T10:00:00Z",
    commonCrawl: [],
    reserve: [{ domain: "example.ma", observedUrls: 1 }],
    registry: [],
  });
  assert.equal(report.reconciliation.domains, 1);
});

test("extracts only same-site legal links", () => {
  const html = `
    <a href="/mentions-legales/">Legal</a>
    <a href="https://www.example.ma/privacy-policy/">Privacy</a>
    <a href="https://evil.example/terms">External</a>
    <a href="/biens/appartement">Listing</a>
  `;
  assert.deepEqual(extractSameSiteLegalLinks(html, "https://example.ma/", "example.ma"), [
    "https://example.ma/mentions-legales/",
    "https://www.example.ma/privacy-policy/",
  ]);
});

test("classifies terms, privacy and non-legal final URLs separately", () => {
  assert.equal(classifyLegalEvidenceUrl("https://example.ma/cgu/"), "TERMS_OR_LEGAL");
  assert.equal(classifyLegalEvidenceUrl("https://example.ma/politique-de-confidentialite/"), "PRIVACY");
  assert.equal(classifyLegalEvidenceUrl("https://example.ma/"), "OTHER");
});

test("standard legal probes remain HTTPS and same-domain", () => {
  const urls = standardLegalUrls("www.example.ma");
  assert.ok(urls.length >= 5);
  assert.ok(urls.every((url) => url.startsWith("https://example.ma/")));
});

test("detects restrictive terms without storing the source text", () => {
  const signals = detectPolicySignals("Toute reproduction ou extraction est interdite sans autorisation préalable écrite.");
  assert.ok(signals.restrictive.includes("explicit_reproduction_restriction"));
  assert.ok(signals.restrictive.includes("prior_authorization_required"));
});

test("detects public channel signals but does not interpret them as permission", () => {
  const signals = detectPolicySignals("Developer documentation for our public API and RSS feed.");
  assert.ok(signals.publicChannel.includes("public_api_signal"));
  assert.ok(signals.publicChannel.includes("public_feed_signal"));

  const review = buildSourcePolicyEvidenceReview(reviewInput([
    legalPage(signals.publicChannel.map((id) => `public_channel:${id}`)),
  ]));
  assert.equal(review.evidenceStatus, "PUBLIC_CHANNEL_SIGNAL_FOUND");
  assert.equal(review.reviewTrack, "PUBLIC_CHANNEL_REVIEW");
  assert.equal(review.policyAssignment, null);
  assert.ok(Object.values(review.registryDraft).every((value) => value === null));
});

test("restrictive terms route to partnership review and never assign policy", () => {
  const review = buildSourcePolicyEvidenceReview(reviewInput([
    legalPage(["restrictive:explicit_reproduction_restriction", "protected_content:copyright_claim"]),
  ]));
  assert.equal(review.evidenceStatus, "RESTRICTIVE_TERMS_FOUND");
  assert.equal(review.reviewTrack, "PARTNERSHIP_REQUIRED_REVIEW");
  assert.equal(review.contactRequired, true);
  assert.equal(review.policyAssignment, null);
  assert.equal(review.registryDraft.authorizationStatusCandidate, null);
});

test("generic prior-authorization wording alone is not enough for a restrictive decision", () => {
  const review = buildSourcePolicyEvidenceReview(reviewInput([
    legalPage(["restrictive:prior_authorization_required"]),
  ]));
  assert.equal(review.evidenceStatus, "TERMS_FOUND_NO_EXPLICIT_PERMISSION");
  assert.equal(review.reviewTrack, "PARTNER_OR_INDEX_ONLY_REVIEW");
});

test("terms without explicit permission stay manual/index-or-partner review", () => {
  const review = buildSourcePolicyEvidenceReview(reviewInput([legalPage(["protected_content:copyright_claim"])]));
  assert.equal(review.evidenceStatus, "TERMS_FOUND_NO_EXPLICIT_PERMISSION");
  assert.equal(review.reviewTrack, "PARTNER_OR_INDEX_ONLY_REVIEW");
  assert.equal(review.policyAssignment, null);
});

test("privacy-only evidence is not promoted to terms found", () => {
  const review = buildSourcePolicyEvidenceReview(reviewInput([
    legalPage([], {
      requestedUrl: "https://example.ma/privacy-policy/",
      finalUrl: "https://example.ma/privacy-policy/",
    }),
  ]));
  assert.equal(review.evidenceStatus, "INSUFFICIENT_LEGAL_EVIDENCE");
  assert.equal(review.reviewTrack, "MANUAL_LEGAL_REVIEW");
  assert.match(review.nextAction, /privacy\/data-protection evidence/i);
});

test("a legal-looking URL that redirects to the homepage is not counted as terms", () => {
  const review = buildSourcePolicyEvidenceReview(reviewInput([
    legalPage(["protected_content:copyright_claim"], {
      requestedUrl: "https://example.ma/mentions-legales/",
      finalUrl: "https://example.ma/",
    }),
  ]));
  assert.equal(review.evidenceStatus, "INSUFFICIENT_LEGAL_EVIDENCE");
  assert.deepEqual(review.protectedContentSignalIds, []);
});

test("missing legal evidence fails closed", () => {
  const review = buildSourcePolicyEvidenceReview(reviewInput([]));
  assert.equal(review.evidenceStatus, "INSUFFICIENT_LEGAL_EVIDENCE");
  assert.equal(review.reviewTrack, "MANUAL_LEGAL_REVIEW");
  assert.equal(review.policyAssignment, null);
});

test("homepage fetch failure is access-limited instead of falsely insufficient", () => {
  const input = reviewInput([]);
  const review = buildSourcePolicyEvidenceReview({
    ...input,
    homepage: { ...input.homepage, status: null, evidenceUrl: "https://example.ma/", error: "TimeoutError" },
  });
  assert.equal(review.evidenceStatus, "ACCESS_OR_FETCH_LIMITED");
  assert.equal(review.reviewTrack, "MANUAL_LEGAL_REVIEW");
});

test("robots-disallowed legal evidence is access-limited without bypass", () => {
  const review = buildSourcePolicyEvidenceReview(reviewInput([
    legalPage([], {
      requestedUrl: "https://example.ma/mentions-legales/",
      finalUrl: null,
      status: null,
      bodySha256: null,
      error: "robots_disallow_path",
    }),
  ]));
  assert.equal(review.evidenceStatus, "ACCESS_OR_FETCH_LIMITED");
});

test("robots block-all is a blocking governance signal", () => {
  const input = reviewInput([]);
  const review = buildSourcePolicyEvidenceReview({
    ...input,
    robots: { ...input.robots, disallowAll: true },
  });
  assert.equal(review.evidenceStatus, "ROBOTS_BLOCK_ALL");
  assert.equal(review.reviewTrack, "BLOCKED_REVIEW");
});

test("noindex is never treated as an authorization signal", () => {
  const input = reviewInput([legalPage()]);
  const review = buildSourcePolicyEvidenceReview({
    ...input,
    homepage: { ...input.homepage, noindex: true },
  });
  assert.equal(review.evidenceStatus, "NOINDEX_OBSERVED");
  assert.equal(review.reviewTrack, "BLOCKED_OR_INDEX_ONLY_REVIEW");
  assert.equal(review.policyAssignment, null);
});

test("only DATA-1.5 capability-review-ready audits can enter DATA-1.6A", () => {
  const ready = technicalAudit();
  const unavailable = technicalAudit({
    seed: { ...technicalAudit().seed, rank: 3, domain: "unavailable.ma" },
    technicalGate: "REVIEW_ONLY_HOMEPAGE_UNAVAILABLE",
  });
  const selected = validateTechnicalAuditsForPolicyReview([unavailable, ready]);
  assert.deepEqual(selected.map((audit) => audit.seed.domain), ["example.ma"]);
});
