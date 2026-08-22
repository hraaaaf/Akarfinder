import test from "node:test";
import assert from "node:assert/strict";
import {
  chooseNativeExternalIndexSeedProvider,
  projectExternalIndexSeed,
} from "../external-index-seed";
import type { UniversalCandidatePromotionRow } from "../universal-candidate-promotion";

function acceptedRow(overrides: Partial<UniversalCandidatePromotionRow> = {}): UniversalCandidatePromotionRow {
  return {
    canonicalUrl: "https://sakane.ma/annonce/appartement-vente-casablanca-123456",
    sourceDomain: "sakane.ma",
    providers: ["openserp"],
    rawRows: 2,
    firstSeenAt: "2026-08-01T00:00:00Z",
    lastSeenAt: "2026-08-22T00:00:00Z",
    classification: {
      sourceDomain: "sakane.ma",
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
    ...overrides,
  };
}

test("M2 preserves OpenSERP as a native seed provider", () => {
  const projected = projectExternalIndexSeed(acceptedRow(), {
    title: " Appartement à vendre Casablanca ",
    snippet: "85 m² - 1 200 000 DH",
    query: "appartement casablanca vente",
  });

  assert.equal(projected.seed_provider, "openserp");
  assert.deepEqual(projected.metadata.external_index.discovery_providers, ["openserp"]);
  assert.equal(projected.metadata.external_index.title, "Appartement à vendre Casablanca");
  assert.equal(projected.freshness_status, "seed_only");
  assert.equal(projected.fresh_last_seen_at, null);
  assert.deepEqual(projected.fresh_channels, []);
});

test("M2 keeps all observed provenance and selects only an actually observed provider", () => {
  const row = acceptedRow({ providers: ["openserp", "public_sitemap", "serper_mass_harvest"] });
  const projected = projectExternalIndexSeed(row);

  assert.equal(projected.seed_provider, "public_sitemap");
  assert.ok(row.providers.includes(projected.seed_provider));
  assert.deepEqual(projected.metadata.external_index.discovery_providers, [
    "openserp",
    "public_sitemap",
    "serper_mass_harvest",
  ]);
});

test("M2 supports the live discovery provider vocabulary without relabeling", () => {
  assert.equal(chooseNativeExternalIndexSeedProvider(["serper_mass_harvest"]), "serper_mass_harvest");
  assert.equal(chooseNativeExternalIndexSeedProvider(["openserp"]), "openserp");
  assert.equal(chooseNativeExternalIndexSeedProvider(["public_sitemap"]), "public_sitemap");
  assert.throws(() => chooseNativeExternalIndexSeedProvider(["serper_search"]), /UNSUPPORTED_PROVIDER/);
});

test("M2 refuses rejected candidates and incomplete observation windows", () => {
  assert.throws(
    () => projectExternalIndexSeed(acceptedRow({ promotionStatus: "REJECTED", rejectionReason: "NON_LISTING_PAGE" })),
    /ACCEPTED_CANDIDATE_REQUIRED/,
  );
  assert.throws(
    () => projectExternalIndexSeed(acceptedRow({ firstSeenAt: null })),
    /OBSERVATION_WINDOW_REQUIRED/,
  );
});
