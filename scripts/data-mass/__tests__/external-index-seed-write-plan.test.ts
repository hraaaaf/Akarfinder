import test from "node:test";
import assert from "node:assert/strict";
import {
  buildExternalIndexSeedWritePlan,
  summarizeExternalIndexSeedWritePlan,
} from "../external-index-seed-write-plan";
import type { UniversalCandidatePromotionRow } from "../universal-candidate-promotion";

function accepted(url: string, provider: string): UniversalCandidatePromotionRow {
  return {
    canonicalUrl: url,
    sourceDomain: new URL(url).hostname,
    providers: [provider],
    rawRows: 1,
    firstSeenAt: "2026-08-01T00:00:00Z",
    lastSeenAt: "2026-08-22T00:00:00Z",
    title: "Appartement à vendre Casablanca",
    snippet: "Appartement immobilier à vendre à Casablanca, 85 m².",
    discoveryQuery: "appartement casablanca vente",
    classification: {
      sourceDomain: new URL(url).hostname,
      domainRole: "DIRECT_PORTAL",
      pageKind: "LIKELY_LISTING_DETAIL",
      geographyScope: "MOROCCO_LIKELY",
      detectedCities: ["Casablanca"],
      transactionSignal: "SALE",
      realEstateScore: 3,
      likelyRealEstate: true,
      reasons: ["REAL_ESTATE_ENTITY_SIGNAL", "TRANSACTION_SIGNAL"],
    },
    promotionStatus: "EXTERNAL_INDEX_CANDIDATE",
    rejectionReason: null,
  };
}

test("M2 write plan never overwrites an existing canonical seed", () => {
  const existingUrl = "https://mubawab.ma/fr/a/1234567/appartement-casablanca";
  const netNewUrl = "https://sakane.ma/annonce/appartement-casablanca-654321";
  const plan = buildExternalIndexSeedWritePlan(
    [accepted(existingUrl, "openserp"), accepted(netNewUrl, "openserp")],
    [{ canonical_url: existingUrl, source_domain: "mubawab.ma", seed_provider: "commoncrawl_cdx" }],
  );

  const existing = plan.find((row) => row.canonicalUrl === existingUrl)!;
  assert.equal(existing.action, "PRESERVE_EXISTING");
  if (existing.action === "PRESERVE_EXISTING") assert.equal(existing.existingSeed.seed_provider, "commoncrawl_cdx");

  const netNew = plan.find((row) => row.canonicalUrl === netNewUrl)!;
  assert.equal(netNew.action, "INSERT_NATIVE");
  if (netNew.action === "INSERT_NATIVE") assert.equal(netNew.seed.seed_provider, "openserp");
});

test("M2 write plan accounting is exact and provider-specific", () => {
  const existingUrl = "https://agenz.ma/fr/annonce/appartement-casablanca-123456";
  const openserpUrl = "https://sakane.ma/annonce/appartement-casablanca-654321";
  const serperUrl = "https://yakeey.com/property/appartement-casablanca-777777";
  const plan = buildExternalIndexSeedWritePlan(
    [accepted(existingUrl, "openserp"), accepted(openserpUrl, "openserp"), accepted(serperUrl, "serper_mass_harvest")],
    [{ canonical_url: existingUrl, source_domain: "agenz.ma", seed_provider: "serper_search" }],
  );

  assert.deepEqual(summarizeExternalIndexSeedWritePlan(plan), {
    acceptedCanonicalUrls: 3,
    insertNative: 2,
    preserveExisting: 1,
    insertByProvider: { openserp: 1, serper_mass_harvest: 1 },
    preservedByExistingProvider: { serper_search: 1 },
  });
});

test("M2 write plan rejects duplicate canonical rows before any write can be planned", () => {
  const row = accepted("https://sakane.ma/annonce/appartement-casablanca-654321", "openserp");
  assert.throws(
    () => buildExternalIndexSeedWritePlan([row, row], []),
    /DUPLICATE_CANONICAL_IN_MANIFEST/,
  );
});
