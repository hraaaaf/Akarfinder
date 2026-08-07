import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAvitoInternalRecoveryReport,
  normalizeGeoToken,
  parseAvitoUrl,
  type AvitoRegistrySnapshot,
} from "../avito-internal-recovery-audit";

const registry: AvitoRegistrySnapshot = {
  source_domain: "avito.ma",
  authorization_status: "unverified",
  acquisition_mode: "public_index_internal_only",
  detail_fetch_policy: "legal_review_required",
  content_reuse_policy: "unknown",
  display_policy: "internal_signal_only",
  display_gate: "hidden",
  machine_gate: "internal_signal_only",
  ingestion_gate: "internal_signal_only",
};

const rules = [
  { category_slug: "appartements", vertical_classification: "real_estate_likely" },
  { category_slug: "terrains_et_fermes", vertical_classification: "real_estate_likely" },
];

const aliases = [{ normalized_alias: "agdal" }, { normalized_alias: "casablanca" }];

test("parseAvitoUrl extracts location and category only for Avito FR detail-shaped URLs", () => {
  assert.deepEqual(
    parseAvitoUrl("https://avito.ma/fr/agdal/appartements/Bel_appartement_123.htm"),
    { locationSlug: "agdal", categorySlug: "appartements" },
  );
  assert.deepEqual(parseAvitoUrl("https://example.com/fr/agdal/appartements/a.htm"), {
    locationSlug: null,
    categorySlug: null,
  });
});

test("normalizeGeoToken is exact-normalization only, not fuzzy matching", () => {
  assert.equal(normalizeGeoToken("Hay_Riad"), "hay riad");
  assert.equal(normalizeGeoToken("Fès"), "fes");
  assert.notEqual(normalizeGeoToken("Agdal Centre"), normalizeGeoToken("Agdal"));
});

test("canonical real-estate row is core-recoverable only with type + intent + geo", () => {
  const report = buildAvitoInternalRecoveryReport({
    generatedAt: "2026-08-07T16:00:00Z",
    registry,
    verticalRules: rules,
    geoAliases: aliases,
    rows: [
      {
        canonical_url: "https://avito.ma/fr/agdal/appartements/Bel_appartement_123.htm",
        seed_provider: "commoncrawl_cdx",
        property_type: "apartment",
        intent: "sale",
        city: null,
        title: null,
        snippet: null,
        price_mad: null,
        surface_m2: null,
        normalization_status: "unavailable",
      },
    ],
  });

  assert.equal(report.summary.recoverableCoreRows, 1);
  assert.equal(report.summary.policyActivableRows, 0);
  assert.equal(report.rows[0]?.recoveryClass, "RECOVERABLE_FROM_EXISTING_DATA");
  assert.equal(report.rows[0]?.publicActivable, false);
});

test("real-estate category with incomplete existing evidence stays insufficient", () => {
  const report = buildAvitoInternalRecoveryReport({
    generatedAt: "2026-08-07T16:00:00Z",
    registry,
    verticalRules: rules,
    geoAliases: aliases,
    rows: [
      {
        canonical_url: "https://avito.ma/fr/agdal/appartements/Bel_appartement_123.htm",
        seed_provider: "commoncrawl_cdx",
        property_type: "apartment",
        intent: null,
        city: null,
        title: null,
        snippet: null,
        price_mad: null,
        surface_m2: null,
        normalization_status: "unavailable",
      },
    ],
  });

  assert.equal(report.summary.insufficientExistingEvidenceRows, 1);
  assert.equal(report.rows[0]?.recoveryClass, "INSUFFICIENT_EXISTING_EVIDENCE");
});

test("non-real-estate Avito category is noise even when lexical fields look property-like", () => {
  const report = buildAvitoInternalRecoveryReport({
    generatedAt: "2026-08-07T16:00:00Z",
    registry,
    verticalRules: rules,
    geoAliases: aliases,
    rows: [
      {
        canonical_url: "https://avito.ma/fr/agdal/voitures_d_occasion/Villa_car_123.htm",
        seed_provider: "commoncrawl_cdx",
        property_type: "villa",
        intent: "sale",
        city: "Rabat",
        title: "Villa car",
        snippet: "looks lexical",
        price_mad: null,
        surface_m2: null,
        normalization_status: "unavailable",
      },
    ],
  });

  assert.equal(report.summary.noiseOrNonListingRows, 1);
  assert.equal(report.summary.canonicalRealEstateRows, 0);
  assert.equal(report.rows[0]?.recoveryClass, "NOISE_OR_NON_LISTING");
});

test("audit fails closed if Avito becomes publicly activable", () => {
  assert.throws(
    () =>
      buildAvitoInternalRecoveryReport({
        generatedAt: "2026-08-07T16:00:00Z",
        registry: {
          ...registry,
          display_gate: "visible",
          display_policy: "public_index_result",
          machine_gate: "public_index_only",
        },
        verticalRules: rules,
        geoAliases: aliases,
        rows: [],
      }),
    /refuses to run/,
  );
});

test("audit rejects non-unavailable rows", () => {
  assert.throws(
    () =>
      buildAvitoInternalRecoveryReport({
        generatedAt: "2026-08-07T16:00:00Z",
        registry,
        verticalRules: rules,
        geoAliases: aliases,
        rows: [
          {
            canonical_url: "https://avito.ma/fr/agdal/appartements/a.htm",
            seed_provider: "commoncrawl_cdx",
            property_type: "apartment",
            intent: "sale",
            city: "Rabat",
            title: null,
            snippet: null,
            price_mad: null,
            surface_m2: null,
            normalization_status: "normalized",
          },
        ],
      }),
    /unavailable rows only/,
  );
});
