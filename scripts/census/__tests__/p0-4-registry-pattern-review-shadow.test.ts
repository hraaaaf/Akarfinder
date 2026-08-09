import test from "node:test";
import assert from "node:assert/strict";
import type { PatternEvidenceRecord } from "../../../lib/acquisition-scale-v1/commoncrawl-pattern-evidence.js";
import {
  P0_4_PATTERN_PROPOSALS,
  P0_4_STRONG_DOMAINS,
  replayPatternProposal,
  type PatternProposal,
} from "../../../lib/acquisition-scale-v1/registry-pattern-review-shadow.js";
import { buildP0_4IndexUrl, parseP0_4IndexLine } from "../p0-4-registry-pattern-review-shadow.js";

function record(url: string): PatternEvidenceRecord {
  return {
    url,
    timestamp: "20260801000000",
    status: "200",
    mime: "text/html",
    index: "CC-MAIN-2026-25",
  };
}

test("P0.4 cohort is frozen to the five P0.3 strong domains", () => {
  assert.equal(P0_4_STRONG_DOMAINS.length, 5);
  assert.equal(new Set(P0_4_STRONG_DOMAINS).size, 5);
  assert.deepEqual(P0_4_PATTERN_PROPOSALS.map((proposal) => proposal.source_domain), [...P0_4_STRONG_DOMAINS]);
});

test("P0.4 Common Crawl endpoint is index-only and domain-scoped", () => {
  const url = new URL(buildP0_4IndexUrl("leaderimmo.ma", "CC-MAIN-2026-25"));
  assert.equal(url.origin, "https://index.commoncrawl.org");
  assert.equal(url.searchParams.get("url"), "leaderimmo.ma");
  assert.equal(url.searchParams.get("matchType"), "domain");
  assert.equal(url.searchParams.get("output"), "json");
});

test("P0.4 parser rejects malformed index rows", () => {
  assert.equal(parseP0_4IndexLine("not-json", "CC-MAIN-2026-25"), null);
  assert.equal(parseP0_4IndexLine(JSON.stringify({ url: "https://leaderimmo.ma/biens/1/foo" }), "CC-MAIN-2026-25"), null);
  const parsed = parseP0_4IndexLine(JSON.stringify({
    url: "https://leaderimmo.ma/biens/1/foo",
    timestamp: "20260801000000",
    status: "200",
    mime: "text/html",
  }), "CC-MAIN-2026-25");
  assert.equal(parsed?.url, "https://leaderimmo.ma/biens/1/foo");
});

test("dedicated biens namespace passes a clean labeled shadow replay", () => {
  const proposal = P0_4_PATTERN_PROPOSALS.find((item) => item.source_domain === "leaderimmo.ma")!;
  const records = [
    ...Array.from({ length: 8 }, (_, index) => record(`https://leaderimmo.ma/biens/${100 + index}/appartement-rabat-${index}`)),
    ...Array.from({ length: 8 }, (_, index) => record(`https://leaderimmo.ma/ville/${index + 1}/rabat/biens`)),
  ];
  const replay = replayPatternProposal(proposal, records);
  assert.equal(replay.decision, "SHADOW_ACCEPTABLE");
  assert.equal(replay.false_positives, 0);
  assert.equal(replay.false_negatives, 0);
  assert.equal(replay.matched_ambiguous, 0);
  assert.equal(replay.precision, 1);
  assert.equal(replay.recall, 1);
});

test("shadow replay rejects a candidate that absorbs a certified negative route", () => {
  const proposal: PatternProposal = {
    source_domain: "leaderimmo.ma",
    candidate_pattern: "^/(?:biens/\\d+/[^/]+|ville/\\d+/rabat/biens)/?$",
    expected_positive_signatures: ["/biens/{id}/{slug}"],
    certified_negative_signatures: ["/ville/{id}/rabat/biens"],
    rationale: "test-only intentionally broad candidate",
  };
  const records = [
    ...Array.from({ length: 6 }, (_, index) => record(`https://leaderimmo.ma/biens/${100 + index}/appartement-rabat-centre`)),
    ...Array.from({ length: 6 }, (_, index) => record(`https://leaderimmo.ma/ville/${20 + index}/rabat/biens`)),
  ];
  const replay = replayPatternProposal(proposal, records);
  assert.equal(replay.decision, "REJECTED_SHADOW");
  assert.equal(replay.false_positives, 6);
  assert.ok(replay.rejection_reasons.includes("false_positive_detected"));
});

test("shadow replay rejects a too-narrow candidate on recall", () => {
  const proposal: PatternProposal = {
    source_domain: "immobilier-a-marrakech.com",
    candidate_pattern: "^/produit/vente-[^/]+/\\d+/?$",
    expected_positive_signatures: ["/produit/{slug}/{id}"],
    certified_negative_signatures: ["/posts/{slug}/{id}"],
    rationale: "test-only intentionally narrow candidate",
  };
  const records = [
    ...Array.from({ length: 5 }, (_, index) => record(`https://immobilier-a-marrakech.com/produit/vente-villa-charme-${index}/${3200 + index}`)),
    ...Array.from({ length: 5 }, (_, index) => record(`https://immobilier-a-marrakech.com/produit/location-villa-charme-${index}/${3300 + index}`)),
    ...Array.from({ length: 6 }, (_, index) => record(`https://immobilier-a-marrakech.com/posts/conseil-maroc-${index}/${100 + index}`)),
  ];
  const replay = replayPatternProposal(proposal, records);
  assert.equal(replay.decision, "REJECTED_SHADOW");
  assert.ok(replay.rejection_reasons.includes("recall_below_0_95"));
  assert.equal(replay.false_negatives, 5);
});

test("matched unlabeled structure is ambiguous and fails closed, not a fabricated false positive", () => {
  const proposal = P0_4_PATTERN_PROPOSALS.find((item) => item.source_domain === "immohammedia.com")!;
  const records = [
    ...Array.from({ length: 6 }, (_, index) => record(`https://immohammedia.com/annonces-location-appartement-mohammedia/appartement-charme-centre-b-${1600 + index}`)),
    ...Array.from({ length: 6 }, (_, index) => record(`https://immohammedia.com/blog/conseil-immobilier-maroc-${index}`)),
    record("https://immohammedia.com/annonces-vente-appartement-mohammedia/172-m2-au-1er-etage-quartier-massira-b-1576"),
  ];
  const replay = replayPatternProposal(proposal, records);
  assert.equal(replay.false_positives, 0);
  assert.equal(replay.matched_ambiguous, 1);
  assert.equal(replay.decision, "REJECTED_SHADOW");
  assert.ok(replay.rejection_reasons.includes("ambiguous_match_detected"));
});

test("queries never change the path-only shadow decision", () => {
  const proposal = P0_4_PATTERN_PROPOSALS.find((item) => item.source_domain === "immobilier-a-marrakech.com")!;
  const records = [
    ...Array.from({ length: 6 }, (_, index) => record(`https://immobilier-a-marrakech.com/produit/villa-charme-gueliz-${index}/${3200 + index}?utm_source=test`)),
    ...Array.from({ length: 6 }, (_, index) => record(`https://immobilier-a-marrakech.com/posts/article-conseil-maroc-${index}/${100 + index}?page=1`)),
  ];
  const replay = replayPatternProposal(proposal, records);
  assert.equal(replay.decision, "SHADOW_ACCEPTABLE");
  assert.equal(replay.false_positives, 0);
  assert.equal(replay.matched_ambiguous, 0);
});
