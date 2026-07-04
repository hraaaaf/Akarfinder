import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  FORBIDDEN_PARTNER_PUBLIC_LABEL_TERMS,
  getPartnerListingPublicLabel,
  getPartnerListingQualityLevel,
} from "../../../lib/partners/partner-listing-quality.js";
import {
  FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT,
  FICTIONAL_PROMOTER_DEMO_CASABLANCA_PROJECT,
} from "../../../lib/partners/partner-listing-examples.js";
import type { PartnerListingStandard } from "../../../lib/partners/partner-listing-types.js";

const NOW = new Date("2026-07-04T12:00:00.000Z");

function standardListing(
  overrides: Partial<PartnerListingStandard> = {},
): Partial<PartnerListingStandard> {
  return {
    ...FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT,
    photos_authorized: false,
    photo_count: 0,
    media_usage_scope: "none",
    contact_authorized: false,
    contact_mode: "hidden",
    bedrooms: undefined,
    bathrooms: undefined,
    proximity_allowed: false,
    neighborhood_context_allowed: false,
    mobility_context_allowed: false,
    ...overrides,
  };
}

describe("partner listing quality", () => {
  it("returns limited when minimum fields are missing", () => {
    assert.equal(
      getPartnerListingQualityLevel({ city: "Casablanca" }, NOW),
      "limited",
    );
  });

  it("returns standard when minimum fields are present", () => {
    assert.equal(
      getPartnerListingQualityLevel(standardListing(), NOW),
      "standard",
    );
  });

  it("returns enriched when location, photos, contact and specs are present", () => {
    assert.equal(
      getPartnerListingQualityLevel(FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT, NOW),
      "enriched",
    );
  });

  it("returns premium_ready when complete listing and authorized context are present", () => {
    assert.equal(
      getPartnerListingQualityLevel(FICTIONAL_PROMOTER_DEMO_CASABLANCA_PROJECT, NOW),
      "premium_ready",
    );
  });

  it("does not return forbidden public labels", () => {
    const levels = ["limited", "standard", "enriched", "premium_ready"] as const;

    for (const level of levels) {
      const label = getPartnerListingPublicLabel(level).toLowerCase();
      for (const forbidden of FORBIDDEN_PARTNER_PUBLIC_LABEL_TERMS) {
        assert.equal(
          label.includes(forbidden),
          false,
          `${label} must not contain ${forbidden}`,
        );
      }
    }
  });
});
