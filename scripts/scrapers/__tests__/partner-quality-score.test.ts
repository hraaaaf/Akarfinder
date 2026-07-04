import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computePartnerQualityScores,
  resolveAuthorizationSource,
  resolveFreshnessTier,
  scoreAuthorizationSource,
  scoreFreshness,
  scoreLocationCompleteness,
  scorePartnerListingQuality,
  scoreSearchRelevance,
} from "../../../lib/partners/partner-quality-score.js";
import { FORBIDDEN_PARTNER_PUBLIC_LABEL_TERMS } from "../../../lib/partners/partner-listing-quality.js";
import {
  FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT,
  FICTIONAL_AGENCY_DEMO_WITHOUT_FLOOR_PLAN,
  FICTIONAL_PROMOTER_DEMO_CASABLANCA_PROJECT,
  FICTIONAL_PROMOTER_DEMO_WITHOUT_FLOOR_PLAN,
} from "../../../lib/partners/partner-listing-examples.js";
import type { PartnerListingStandard } from "../../../lib/partners/partner-listing-types.js";
import type { PartnerAuthorizationSource } from "../../../lib/partners/partner-quality-score-types.js";

const NOW = new Date("2026-07-05T12:00:00.000Z");

describe("partner quality scores — quality levels through composite", () => {
  it("returns limited for a minimal listing", () => {
    const scores = computePartnerQualityScores({ city: "Casablanca" }, undefined, NOW);
    assert.equal(scores.quality_level, "limited");
    assert.equal(scores.public_label, "Informations limitees");
  });

  it("returns standard for a listing with only the mandatory core", () => {
    const listing: Partial<PartnerListingStandard> = {
      ...FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT,
      photos_authorized: false,
      photo_count: 0,
      media_usage_scope: "none",
      contact_authorized: false,
      contact_mode: "hidden",
      bedrooms: undefined,
      bathrooms: undefined,
    };
    const scores = computePartnerQualityScores(listing, undefined, NOW);
    assert.equal(scores.quality_level, "standard");
    assert.equal(scores.public_label, "Fiche structuree");
  });

  it("returns enriched for a rich listing without full premium context", () => {
    const listing: Partial<PartnerListingStandard> = {
      ...FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT,
      proximity_allowed: false,
    };
    const scores = computePartnerQualityScores(listing, undefined, NOW);
    assert.equal(scores.quality_level, "enriched");
    assert.equal(scores.public_label, "Fiche enrichie");
  });

  it("returns premium_ready for a promoter with floor plan, location, photos and contact", () => {
    const scores = computePartnerQualityScores(
      FICTIONAL_PROMOTER_DEMO_CASABLANCA_PROJECT,
      undefined,
      NOW,
    );
    assert.equal(scores.quality_level, "premium_ready");
    assert.equal(scores.public_label, "Presentation premium");
  });

  it("never lets a promoter without floor plan reach premium_ready", () => {
    const scores = computePartnerQualityScores(
      FICTIONAL_PROMOTER_DEMO_WITHOUT_FLOOR_PLAN,
      undefined,
      NOW,
    );
    assert.notEqual(scores.quality_level, "premium_ready");
  });

  it("lets a complete agency reach premium_ready without floor plan", () => {
    const scores = computePartnerQualityScores(
      FICTIONAL_AGENCY_DEMO_WITHOUT_FLOOR_PLAN,
      undefined,
      NOW,
    );
    assert.equal(scores.quality_level, "premium_ready");
  });

  it("never returns a forbidden public label", () => {
    const listings = [
      { city: "Casablanca" },
      FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT,
      FICTIONAL_AGENCY_DEMO_WITHOUT_FLOOR_PLAN,
      FICTIONAL_PROMOTER_DEMO_CASABLANCA_PROJECT,
      FICTIONAL_PROMOTER_DEMO_WITHOUT_FLOOR_PLAN,
    ];
    for (const listing of listings) {
      const { public_label } = computePartnerQualityScores(listing, undefined, NOW);
      const normalized = public_label.toLowerCase();
      for (const term of FORBIDDEN_PARTNER_PUBLIC_LABEL_TERMS) {
        assert.equal(
          normalized.includes(term),
          false,
          `label "${public_label}" must not contain "${term}"`,
        );
      }
    }
  });
});

describe("authorization_score", () => {
  it("orders sources: web_external < partner_authorized < agency_partner < premium tiers < first_party", () => {
    const order: PartnerAuthorizationSource[] = [
      "web_external",
      "partner_authorized",
      "agency_partner",
      "agency_premium",
      "first_party",
    ];
    for (let i = 1; i < order.length; i += 1) {
      assert.ok(
        scoreAuthorizationSource(order[i]) > scoreAuthorizationSource(order[i - 1]),
        `${order[i]} must outscore ${order[i - 1]}`,
      );
    }
    assert.equal(
      scoreAuthorizationSource("promoter_partner"),
      scoreAuthorizationSource("agency_premium"),
    );
  });

  it("resolves the source from the listing tier", () => {
    assert.equal(
      resolveAuthorizationSource(FICTIONAL_PROMOTER_DEMO_CASABLANCA_PROJECT),
      "promoter_partner",
    );
    assert.equal(
      resolveAuthorizationSource(FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT),
      "agency_premium",
    );
    assert.equal(resolveAuthorizationSource({ city: "Fes" }), "web_external");
  });
});

describe("search_relevance_score", () => {
  it("scores a full match at 100", () => {
    const score = scoreSearchRelevance(FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT, {
      transaction: "rent",
      city: "Rabat",
      district: "Agdal",
      property_type: "apartment",
      budget_max: 9000,
      min_surface_m2: 60,
      profile: "family",
    });
    assert.equal(score, 100);
  });

  it("caps the score on transaction mismatch so it cannot outrank relevant results", () => {
    const score = scoreSearchRelevance(FICTIONAL_PROMOTER_DEMO_CASABLANCA_PROJECT, {
      transaction: "rent",
      city: "Casablanca",
    });
    assert.ok(score <= 20, `expected <= 20, got ${score}`);
  });

  it("accepts new-build listings for a buy intent but not for a rent intent", () => {
    const buyScore = scoreSearchRelevance(FICTIONAL_PROMOTER_DEMO_CASABLANCA_PROJECT, {
      transaction: "sale",
      city: "Casablanca",
    });
    const rentScore = scoreSearchRelevance(FICTIONAL_PROMOTER_DEMO_CASABLANCA_PROJECT, {
      transaction: "rent",
      city: "Casablanca",
    });
    assert.ok(buyScore > rentScore);
  });

  it("does not penalize unspecified intent criteria", () => {
    const score = scoreSearchRelevance(FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT, {});
    assert.equal(score, 100);
  });

  it("penalizes a city mismatch without disqualifying", () => {
    const score = scoreSearchRelevance(FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT, {
      transaction: "rent",
      city: "Marrakech",
    });
    assert.ok(score < 100 && score > 20);
  });
});

describe("partner_listing_quality_score", () => {
  it("gives a complete promoter listing a higher score than a stripped one", () => {
    const full = scorePartnerListingQuality(FICTIONAL_PROMOTER_DEMO_CASABLANCA_PROJECT, NOW);
    const stripped = scorePartnerListingQuality(
      {
        ...FICTIONAL_PROMOTER_DEMO_CASABLANCA_PROJECT,
        photos_authorized: false,
        contact_authorized: false,
        floor_plan_authorized: false,
        floor_plan_display_mode: "hidden",
        normalized_description: "",
        last_partner_update_at: undefined,
        proximity_allowed: false,
      },
      NOW,
    );
    assert.ok(full > stripped);
    assert.equal(full, 100);
  });

  it("scores an empty listing at 0", () => {
    assert.equal(scorePartnerListingQuality({}, NOW), 0);
  });
});

describe("location_completeness_score", () => {
  it("ranks exact_address_authorized above approximate_zone above district_only", () => {
    const exact = scoreLocationCompleteness({ location_level: "exact_address_authorized" });
    const approx = scoreLocationCompleteness({ location_level: "approximate_zone" });
    const district = scoreLocationCompleteness({ location_level: "district_only" });
    assert.ok(exact > approx && approx > district && district > 0);
  });

  it("adds context bonuses and caps at 100", () => {
    const score = scoreLocationCompleteness({
      location_level: "exact_address_authorized",
      proximity_allowed: true,
      mobility_context_allowed: true,
      neighborhood_context_allowed: true,
    });
    assert.equal(score, 100);
  });
});

describe("freshness_score", () => {
  it("scores recent > stale > unknown", () => {
    const recent = scoreFreshness("2026-07-01T00:00:00.000Z", NOW);
    const stale = scoreFreshness("2025-01-01T00:00:00.000Z", NOW);
    const unknown = scoreFreshness(undefined, NOW);
    assert.ok(recent > stale && stale > unknown);
    assert.equal(resolveFreshnessTier("2026-07-01T00:00:00.000Z", NOW), "recent");
    assert.equal(resolveFreshnessTier("2025-01-01T00:00:00.000Z", NOW), "stale");
    assert.equal(resolveFreshnessTier("not-a-date", NOW), "unknown");
  });
});
