import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateListingQualityPassportV1 } from "../../../lib/intelligence/listing-quality-passport-v1.js";
import type { CanonicalPropertyV1 } from "../../../lib/property-schema/core.js";
import type { CompletenessResultV1 } from "../../../lib/property-schema/completeness.js";
import type { FreshnessProvenanceV2 } from "../../../lib/intelligence/freshness-provenance-v2.js";
import type { AnomalyEngineV1 } from "../../../lib/intelligence/anomaly-engine-v1.js";
import type { MultiSourcePropertyIntelligenceV1 } from "../../../lib/intelligence/multisource-property-intelligence-v1.js";

function propertyWithMedia(images: number, allowed = true, floorPlans = 0): CanonicalPropertyV1 {
  const media = [
    ...Array.from({ length: images }, (_, index) => ({
      media_id: `image-${index}`,
      property_id: "p1",
      offer_id: "o1",
      type: "image" as const,
      url: `https://example.ma/${index}.jpg`,
      source_url: null,
      rights_status: allowed ? "allowed" as const : "unknown" as const,
      publication_permission: allowed ? "allowed" as const : "unknown" as const,
      cache_permission: false,
      download_permission: false,
      attribution: null,
      observed_at: null,
      last_checked_at: null,
    })),
    ...Array.from({ length: floorPlans }, (_, index) => ({
      media_id: `plan-${index}`,
      property_id: "p1",
      offer_id: "o1",
      type: "floor_plan" as const,
      url: `https://example.ma/plan-${index}.jpg`,
      source_url: null,
      rights_status: allowed ? "allowed" as const : "unknown" as const,
      publication_permission: allowed ? "allowed" as const : "unknown" as const,
      cache_permission: false,
      download_permission: false,
      attribution: null,
      observed_at: null,
      last_checked_at: null,
    })),
  ];

  return { property_id: "p1", media } as unknown as CanonicalPropertyV1;
}

function completeness(score: number): CompletenessResultV1 {
  return {
    score,
    level: "detailed",
    public_label: "Informations détaillées",
    measured_as: "information_completeness",
    present_weight: score,
    total_weight: 100,
    missing_keys: [],
    notes: [],
  };
}

function freshness(channel: FreshnessProvenanceV2["verification_channel"], score: number | null): FreshnessProvenanceV2 {
  return {
    verification_channel: channel,
    freshness_score: score,
  } as unknown as FreshnessProvenanceV2;
}

function anomaly(score: number | null): AnomalyEngineV1 {
  return {
    status: score == null ? "insufficient_data" : "evaluated",
    anomaly_score: score,
  } as unknown as AnomalyEngineV1;
}

function multisource(options: {
  isMulti?: boolean;
  level?: MultiSourcePropertyIntelligenceV1["linkage"]["level"];
  contradictions?: boolean;
} = {}): MultiSourcePropertyIntelligenceV1 {
  return {
    is_multi_source: options.isMulti ?? false,
    linkage: {
      level: options.level ?? "unresolved",
      contradictions_present: options.contradictions ?? false,
    },
  } as unknown as MultiSourcePropertyIntelligenceV1;
}

describe("ListingQualityPassportV1", () => {
  it("keeps completeness, trust and media as separate dimensions", () => {
    const result = evaluateListingQualityPassportV1({
      property: propertyWithMedia(10, true, 1),
      selected_offer: null,
      completeness: completeness(92),
      freshness: freshness("partner_structured", 100),
      anomaly: anomaly(0),
      multisource: multisource({ isMulti: true, level: "explicitly_supported" }),
    });

    assert.equal(result.completeness_score, 92);
    assert.equal(result.trust_score, 98);
    assert.equal(result.media_score, 100);
    assert.equal(result.ranking_quality_score, 96);
    assert.equal(result.trust_coverage_percent, 100);
  });

  it("does not invent trust when coverage is insufficient", () => {
    const result = evaluateListingQualityPassportV1({
      property: propertyWithMedia(0),
      selected_offer: null,
      completeness: completeness(90),
      freshness: freshness("system_unknown", null),
      anomaly: anomaly(null),
      multisource: multisource(),
    });

    assert.equal(result.trust_score, null);
    assert.equal(result.ranking_quality_score, null);
    assert.equal(result.trust_coverage_percent, 0);
  });

  it("never rewards media without explicit publication permission and rights", () => {
    const blocked = evaluateListingQualityPassportV1({
      property: propertyWithMedia(12, false, 1),
      selected_offer: null,
      completeness: completeness(90),
      freshness: freshness("first_party", 100),
      anomaly: anomaly(0),
      multisource: multisource(),
    });

    assert.equal(blocked.media_score, 0);
  });

  it("penalizes contradictions instead of granting a multi-source bonus", () => {
    const result = evaluateListingQualityPassportV1({
      property: propertyWithMedia(6),
      selected_offer: null,
      completeness: completeness(90),
      freshness: freshness("authorized_source_observation", 90),
      anomaly: anomaly(5),
      multisource: multisource({ isMulti: true, level: "strong_candidate", contradictions: true }),
    });

    assert.equal(result.components.corroboration, 0);
    assert.ok((result.trust_score ?? 100) < 90);
  });

  it("keeps market context outside intrinsic listing quality", () => {
    const input = {
      property: propertyWithMedia(3),
      selected_offer: null,
      completeness: completeness(80),
      freshness: freshness("search_discovery", 70),
      anomaly: anomaly(10),
      multisource: multisource(),
    };

    const first = evaluateListingQualityPassportV1(input);
    const second = evaluateListingQualityPassportV1(input);
    assert.deepEqual(first, second);
    assert.ok(first.limitations.some((item) => item.includes("contexte marché")));
  });
});
