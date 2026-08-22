import test from "node:test";
import assert from "node:assert/strict";
import {
  EXTERNAL_INDEX_SNIPPET_MAX_CHARS,
  isExternalIndexSafeCanonicalUrl,
  projectExternalIndexSeed,
} from "../external-index-seed";
import type { UniversalCandidatePromotionRow } from "../universal-candidate-promotion";

function accepted(overrides: Partial<UniversalCandidatePromotionRow> = {}): UniversalCandidatePromotionRow {
  return {
    canonicalUrl: "https://expat.com/fr/immobilier/afrique/maroc/39-maisons-a-louer/739858-villa.html",
    sourceDomain: "expat.com",
    providers: ["openserp"],
    rawRows: 1,
    firstSeenAt: "2026-08-01T00:00:00.000Z",
    lastSeenAt: "2026-08-22T00:00:00.000Z",
    title: "Villa à louer — WhatsApp +212 661 590 451",
    snippet: `Maison à louer. Contact test@example.com. Instagram @achraf.immobilier. ${"Description factuelle ".repeat(40)}`,
    discoveryQuery: "villa rabat @contact",
    classification: {
      sourceDomain: "expat.com",
      domainRole: "UNKNOWN",
      likelyRealEstate: true,
      realEstateScore: 5,
      pageKind: "LIKELY_LISTING_DETAIL",
      geographyScope: "MOROCCO_LIKELY",
      transactionSignal: "RENT",
      detectedCities: ["Rabat"],
      reasons: ["test fixture"],
    },
    promotionStatus: "EXTERNAL_INDEX_CANDIDATE",
    rejectionReason: null,
    ...overrides,
  };
}

test("external index seed strips contact data and bounds copied text", () => {
  const seed = projectExternalIndexSeed(accepted());
  const text = [
    seed.metadata.external_index.title,
    seed.metadata.external_index.snippet,
    seed.metadata.external_index.query,
  ].filter(Boolean).join(" ");
  assert.doesNotMatch(text, /(?:\+?212|0)[\s.-]?[5-7](?:[\s.-]?\d){8}/i);
  assert.doesNotMatch(text, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  assert.doesNotMatch(text, /\b(?:whatsapp|instagram|insta|facebook|tiktok|telegram)\b/i);
  assert.doesNotMatch(text, /(^|[\s(])@[A-Za-z0-9._-]{2,}/);
  assert.ok((seed.metadata.external_index.snippet?.length ?? 0) <= EXTERNAL_INDEX_SNIPPET_MAX_CHARS);
});

test("external index rejects contact identifiers embedded in canonical URL", () => {
  const unsafe = "https://sakane.ma/maisons-et-villas/maison/asilah/8287/+212661590451";
  assert.equal(isExternalIndexSafeCanonicalUrl(unsafe), false);
  assert.throws(
    () => projectExternalIndexSeed(accepted({ canonicalUrl: unsafe, sourceDomain: "sakane.ma", classification: { ...accepted().classification!, sourceDomain: "sakane.ma" } })),
    /MASS_INDEX_M2_SENSITIVE_CANONICAL_URL/,
  );
});

test("external index drops text carrying secret markers rather than storing it", () => {
  const seed = projectExternalIndexSeed(accepted({ snippet: "Authorization bearer token abc123" }));
  assert.equal(seed.metadata.external_index.snippet, null);
});
