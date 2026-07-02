// SOURCE-ACCESS-REGISTRY-1
// Tests for the central source classification registry.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getSourceAccessType,
  canPublishStructuredListing,
  canShowInternalListingDetail,
  canUseAsBenchmark,
  isLegacyThirdPartySource,
  isPublicExternalLiveSource,
  isFirstPartySource,
  isPartnerAuthorizedSource,
  isBenchmarkOnlySource,
  getSourcesByType,
} from "../../../lib/sources/source-access-registry.js";

// ─── getSourceAccessType — known sources ──────────────────────────────────────

describe("getSourceAccessType — legacy third-party sources", () => {
  it("mubawab is third_party_legacy", () => {
    assert.equal(getSourceAccessType("mubawab"), "third_party_legacy");
  });

  it("avito is third_party_legacy", () => {
    assert.equal(getSourceAccessType("avito"), "third_party_legacy");
  });

  it("sarouty is third_party_legacy", () => {
    assert.equal(getSourceAccessType("sarouty"), "third_party_legacy");
  });

  it("case-insensitive: MUBAWAB is third_party_legacy", () => {
    assert.equal(getSourceAccessType("MUBAWAB"), "third_party_legacy");
  });

  it("case-insensitive: Avito is third_party_legacy", () => {
    assert.equal(getSourceAccessType("Avito"), "third_party_legacy");
  });
});

describe("getSourceAccessType — benchmark sources", () => {
  it("yakeey is benchmark_source", () => {
    assert.equal(getSourceAccessType("yakeey"), "benchmark_source");
  });

  it("yakeey_serper is benchmark_source", () => {
    assert.equal(getSourceAccessType("yakeey_serper"), "benchmark_source");
  });
});

describe("getSourceAccessType — Search Gateway live sources (public_external_live)", () => {
  it("avito_serper is public_external_live", () => {
    assert.equal(getSourceAccessType("avito_serper"), "public_external_live");
  });

  it("sarouty_serper is public_external_live", () => {
    assert.equal(getSourceAccessType("sarouty_serper"), "public_external_live");
  });

  it("agenz_serper is public_external_live", () => {
    assert.equal(getSourceAccessType("agenz_serper"), "public_external_live");
  });

  it("logic_immo_serper is public_external_live", () => {
    assert.equal(getSourceAccessType("logic_immo_serper"), "public_external_live");
  });

  it("mubawab_serper is public_external_live", () => {
    assert.equal(getSourceAccessType("mubawab_serper"), "public_external_live");
  });

  it("serper is public_external_live", () => {
    assert.equal(getSourceAccessType("serper"), "public_external_live");
  });

  it("search_gateway is public_external_live", () => {
    assert.equal(getSourceAccessType("search_gateway"), "public_external_live");
  });

  it("agenz is public_external_live", () => {
    assert.equal(getSourceAccessType("agenz"), "public_external_live");
  });

  it("logic-immo is public_external_live", () => {
    assert.equal(getSourceAccessType("logic-immo"), "public_external_live");
  });

  it("logic_immo is public_external_live", () => {
    assert.equal(getSourceAccessType("logic_immo"), "public_external_live");
  });
});

describe("getSourceAccessType — first-party sources", () => {
  it("akarfinder is first_party", () => {
    assert.equal(getSourceAccessType("akarfinder"), "first_party");
  });

  it("internal is first_party", () => {
    assert.equal(getSourceAccessType("internal"), "first_party");
  });
});

describe("getSourceAccessType — partner-authorized sources", () => {
  it("partner_csv is partner_authorized", () => {
    assert.equal(getSourceAccessType("partner_csv"), "partner_authorized");
  });
});

describe("getSourceAccessType — unknown sources fall back to third_party_legacy", () => {
  it("unknown source defaults to third_party_legacy", () => {
    assert.equal(getSourceAccessType("unknown_portal_xyz"), "third_party_legacy");
  });

  it("empty string defaults to third_party_legacy", () => {
    assert.equal(getSourceAccessType(""), "third_party_legacy");
  });
});

// ─── canPublishStructuredListing ──────────────────────────────────────────────

describe("canPublishStructuredListing", () => {
  it("first_party (akarfinder) → true", () => {
    assert.equal(canPublishStructuredListing("akarfinder"), true);
  });

  it("first_party (internal) → true", () => {
    assert.equal(canPublishStructuredListing("internal"), true);
  });

  it("partner_authorized (partner_csv) → true", () => {
    assert.equal(canPublishStructuredListing("partner_csv"), true);
  });

  it("third_party_legacy (mubawab) → false", () => {
    assert.equal(canPublishStructuredListing("mubawab"), false);
  });

  it("third_party_legacy (avito) → false", () => {
    assert.equal(canPublishStructuredListing("avito"), false);
  });

  it("third_party_legacy (sarouty) → false", () => {
    assert.equal(canPublishStructuredListing("sarouty"), false);
  });

  it("public_external_live (avito_serper) → false", () => {
    assert.equal(canPublishStructuredListing("avito_serper"), false);
  });

  it("public_external_live (search_gateway) → false", () => {
    assert.equal(canPublishStructuredListing("search_gateway"), false);
  });

  it("benchmark_source (yakeey) → false", () => {
    assert.equal(canPublishStructuredListing("yakeey"), false);
  });

  it("unknown source → false", () => {
    assert.equal(canPublishStructuredListing("some_unknown"), false);
  });
});

// ─── canShowInternalListingDetail ─────────────────────────────────────────────

describe("canShowInternalListingDetail", () => {
  it("first_party → true", () => {
    assert.equal(canShowInternalListingDetail("akarfinder"), true);
  });

  it("partner_authorized → true", () => {
    assert.equal(canShowInternalListingDetail("partner_csv"), true);
  });

  it("third_party_legacy (mubawab) → false", () => {
    assert.equal(canShowInternalListingDetail("mubawab"), false);
  });

  it("third_party_legacy (avito) → false", () => {
    assert.equal(canShowInternalListingDetail("avito"), false);
  });

  it("public_external_live (sarouty_serper) → false", () => {
    assert.equal(canShowInternalListingDetail("sarouty_serper"), false);
  });

  it("benchmark_source (yakeey) → false", () => {
    assert.equal(canShowInternalListingDetail("yakeey"), false);
  });
});

// ─── canUseAsBenchmark ────────────────────────────────────────────────────────

describe("canUseAsBenchmark", () => {
  it("yakeey → true", () => {
    assert.equal(canUseAsBenchmark("yakeey"), true);
  });

  it("yakeey_serper → true", () => {
    assert.equal(canUseAsBenchmark("yakeey_serper"), true);
  });

  it("first_party (akarfinder) → true", () => {
    assert.equal(canUseAsBenchmark("akarfinder"), true);
  });

  it("third_party_legacy (mubawab) → false", () => {
    assert.equal(canUseAsBenchmark("mubawab"), false);
  });

  it("public_external_live (serper) → false", () => {
    assert.equal(canUseAsBenchmark("serper"), false);
  });
});

// ─── Predicates ───────────────────────────────────────────────────────────────

describe("isLegacyThirdPartySource", () => {
  it("mubawab → true", () => {
    assert.equal(isLegacyThirdPartySource("mubawab"), true);
  });

  it("avito → true", () => {
    assert.equal(isLegacyThirdPartySource("avito"), true);
  });

  it("sarouty → true", () => {
    assert.equal(isLegacyThirdPartySource("sarouty"), true);
  });

  it("akarfinder → false", () => {
    assert.equal(isLegacyThirdPartySource("akarfinder"), false);
  });

  it("yakeey → false", () => {
    assert.equal(isLegacyThirdPartySource("yakeey"), false);
  });

  it("avito_serper → false (live, not legacy)", () => {
    assert.equal(isLegacyThirdPartySource("avito_serper"), false);
  });
});

describe("isPublicExternalLiveSource", () => {
  it("avito_serper → true", () => {
    assert.equal(isPublicExternalLiveSource("avito_serper"), true);
  });

  it("search_gateway → true", () => {
    assert.equal(isPublicExternalLiveSource("search_gateway"), true);
  });

  it("serper → true", () => {
    assert.equal(isPublicExternalLiveSource("serper"), true);
  });

  it("agenz → true", () => {
    assert.equal(isPublicExternalLiveSource("agenz"), true);
  });

  it("mubawab → false (legacy, not live)", () => {
    assert.equal(isPublicExternalLiveSource("mubawab"), false);
  });

  it("yakeey → false (benchmark, not live)", () => {
    assert.equal(isPublicExternalLiveSource("yakeey"), false);
  });
});

describe("isFirstPartySource", () => {
  it("akarfinder → true", () => {
    assert.equal(isFirstPartySource("akarfinder"), true);
  });

  it("internal → true", () => {
    assert.equal(isFirstPartySource("internal"), true);
  });

  it("mubawab → false", () => {
    assert.equal(isFirstPartySource("mubawab"), false);
  });
});

describe("isPartnerAuthorizedSource", () => {
  it("partner_csv → true", () => {
    assert.equal(isPartnerAuthorizedSource("partner_csv"), true);
  });

  it("mubawab → false", () => {
    assert.equal(isPartnerAuthorizedSource("mubawab"), false);
  });

  it("akarfinder → false (first_party, not partner)", () => {
    assert.equal(isPartnerAuthorizedSource("akarfinder"), false);
  });
});

describe("isBenchmarkOnlySource", () => {
  it("yakeey → true", () => {
    assert.equal(isBenchmarkOnlySource("yakeey"), true);
  });

  it("yakeey_serper → true", () => {
    assert.equal(isBenchmarkOnlySource("yakeey_serper"), true);
  });

  it("akarfinder → false", () => {
    assert.equal(isBenchmarkOnlySource("akarfinder"), false);
  });

  it("avito → false", () => {
    assert.equal(isBenchmarkOnlySource("avito"), false);
  });
});

// ─── Cross-cutting invariants ─────────────────────────────────────────────────

describe("Registry invariants", () => {
  it("Yakeey is never publishable as a structured listing", () => {
    assert.equal(canPublishStructuredListing("yakeey"), false);
    assert.equal(canPublishStructuredListing("yakeey_serper"), false);
  });

  it("Search Gateway sources are never publishable as structured listings", () => {
    const sgSources = [
      "avito_serper", "sarouty_serper", "agenz_serper",
      "logic_immo_serper", "mubawab_serper", "serper", "search_gateway",
    ];
    for (const s of sgSources) {
      assert.equal(
        canPublishStructuredListing(s),
        false,
        `${s} must not be publishable as structured listing`
      );
    }
  });

  it("Search Gateway sources never allow internal detail pages", () => {
    const sgSources = [
      "avito_serper", "sarouty_serper", "agenz_serper",
      "logic_immo_serper", "mubawab_serper", "serper", "search_gateway",
    ];
    for (const s of sgSources) {
      assert.equal(
        canShowInternalListingDetail(s),
        false,
        `${s} must not allow internal detail`
      );
    }
  });

  it("Legacy frozen sources (mubawab, avito, sarouty) are not publishable", () => {
    for (const s of ["mubawab", "avito", "sarouty"]) {
      assert.equal(canPublishStructuredListing(s), false, `${s} must not be publishable`);
    }
  });

  it("Unknown source defaults to third_party_legacy — never auto-published", () => {
    const unknown = "brand_new_portal_xyz";
    assert.equal(getSourceAccessType(unknown), "third_party_legacy");
    assert.equal(canPublishStructuredListing(unknown), false);
    assert.equal(canShowInternalListingDetail(unknown), false);
  });

  it("getSourcesByType returns at least one source per defined type", () => {
    assert.ok(getSourcesByType("first_party").length > 0);
    assert.ok(getSourcesByType("partner_authorized").length > 0);
    assert.ok(getSourcesByType("public_external_live").length > 0);
    assert.ok(getSourcesByType("third_party_legacy").length > 0);
    assert.ok(getSourcesByType("benchmark_source").length > 0);
  });

  it("mubawab does not appear in public_external_live category", () => {
    const liveNames = getSourcesByType("public_external_live");
    assert.ok(!liveNames.includes("mubawab"), "mubawab must not be in public_external_live");
  });

  it("yakeey does not appear in third_party_legacy category", () => {
    const legacyNames = getSourcesByType("third_party_legacy");
    assert.ok(!legacyNames.includes("yakeey"), "yakeey must not be in third_party_legacy");
  });
});
