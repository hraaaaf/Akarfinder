import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDomainPatternEvidence,
  buildPathSignature,
  type PatternEvidenceRecord,
} from "../../../lib/acquisition-scale-v1/commoncrawl-pattern-evidence.js";
import { buildPatternEvidenceIndexUrl, parsePatternEvidenceLine, P0_3_TARGET_DOMAINS } from "../p0-3-commoncrawl-pattern-evidence.js";

function record(url: string): PatternEvidenceRecord {
  return {
    url,
    timestamp: "20260801000000",
    status: "200",
    mime: "text/html",
    index: "CC-MAIN-2026-25",
  };
}

test("P0.3 cohort is frozen to the 18 P0.2 pattern-missing domains", () => {
  assert.equal(P0_3_TARGET_DOMAINS.length, 18);
  assert.equal(new Set(P0_3_TARGET_DOMAINS).size, 18);
});

test("Common Crawl endpoint is index-only and domain-scoped", () => {
  const url = new URL(buildPatternEvidenceIndexUrl("example.ma", "CC-MAIN-2026-25"));
  assert.equal(url.origin, "https://index.commoncrawl.org");
  assert.equal(url.searchParams.get("url"), "example.ma");
  assert.equal(url.searchParams.get("matchType"), "domain");
  assert.equal(url.searchParams.get("output"), "json");
});

test("parses JSONL index records and rejects malformed lines", () => {
  assert.equal(parsePatternEvidenceLine("not-json", "CC-MAIN-2026-25"), null);
  const parsed = parsePatternEvidenceLine(JSON.stringify({
    url: "https://example.ma/property/foo-123",
    timestamp: "20260801000000",
    status: "200",
    mime: "text/html",
  }), "CC-MAIN-2026-25");
  assert.equal(parsed?.url, "https://example.ma/property/foo-123");
});

test("normalizes strong numeric listing identifiers into a stable signature", () => {
  assert.equal(buildPathSignature("https://example.ma/fr/annonces/villa-superbe-12345.html"), "/fr/annonces/{slug}-{id}.html");
  assert.equal(buildPathSignature("https://example.ma/property/98765"), "/property/{id}");
});

test("marks repeated ID-bearing structures as strong evidence", () => {
  const records = Array.from({ length: 8 }, (_, index) => record(`https://example.ma/fr/annonces/villa-${1000 + index}.html`));
  const evidence = buildDomainPatternEvidence("example.ma", records);
  assert.equal(evidence.state, "STRONG_PATTERN_EVIDENCE");
  assert.equal(evidence.unique_urls, 8);
  assert.equal(evidence.top_signatures[0].id_bearing, true);
});

test("marks repeated property namespace without an identifier as reviewable only", () => {
  const records = Array.from({ length: 8 }, (_, index) => record(`https://example.ma/property/villa-casa-${index}-hay-riad`));
  const evidence = buildDomainPatternEvidence("example.ma", records);
  assert.equal(evidence.state, "REVIEWABLE_PATTERN_EVIDENCE");
  assert.equal(evidence.top_signatures[0].property_namespace, true);
});

test("fails closed when evidence is sparse or non-HTML", () => {
  const evidence = buildDomainPatternEvidence("example.ma", [
    record("https://example.ma/about"),
    { ...record("https://example.ma/property/foo-1"), status: "404" },
  ]);
  assert.equal(evidence.state, "INSUFFICIENT_URL_INDEX_EVIDENCE");
  assert.equal(evidence.unique_urls, 1);
});

test("ignores records whose canonical host does not match the target domain", () => {
  const evidence = buildDomainPatternEvidence("example.ma", [
    record("https://other.ma/property/foo-123"),
    record("https://example.ma/property/foo-124"),
  ]);
  assert.equal(evidence.unique_urls, 1);
});
