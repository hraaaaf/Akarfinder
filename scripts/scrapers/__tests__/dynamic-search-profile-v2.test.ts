import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { applySearchProfileEvent, deriveNeighborhoodPreferenceWeights, profileIsSearchReady } from "../../../lib/search-profile-v2/profile-engine.js";
import { createEmptyDynamicSearchProfileV2 } from "../../../lib/search-profile-v2/types.js";

describe("#19D Dynamic Search Profile V2", () => {
  it("builds a search profile from objective, use, location and budget without a rigid persona", () => {
    let profile = createEmptyDynamicSearchProfileV2("2026-07-22T00:00:00Z");
    profile = applySearchProfileEvent(profile, { type: "objective", value: "buy" });
    profile = applySearchProfileEvent(profile, { type: "uses", values: ["primary_residence", "family_housing"] });
    profile = applySearchProfileEvent(profile, { type: "cities", values: ["Casablanca"] });
    profile = applySearchProfileEvent(profile, { type: "budget", purchase_max_mad: 1_800_000 });
    assert.equal(profileIsSearchReady(profile).ready, true);
    assert.equal((profile as unknown as Record<string, unknown>).audience, undefined);
  });

  it("keeps absolute property constraints separate from neighborhood preferences", () => {
    let profile = createEmptyDynamicSearchProfileV2();
    profile = applySearchProfileEvent(profile, { type: "property", min_surface_m2: 90, min_bedrooms: 3, required_features: ["parking"] });
    profile = applySearchProfileEvent(profile, { type: "preference", key: "calmness", direction: "prefer_high", importance: "high" });
    assert.equal(profile.property.min_surface_m2, 90);
    assert.equal(profile.neighborhood_preferences[0]?.key, "calmness");
  });

  it("weights explicit priorities above weak behavioral inference", () => {
    let profile = createEmptyDynamicSearchProfileV2();
    profile = applySearchProfileEvent(profile, { type: "preference", key: "family_fit", direction: "prefer_high", importance: "high", source: "explicit", confidence: "high" });
    profile = applySearchProfileEvent(profile, { type: "preference", key: "animation", direction: "prefer_high", importance: "high", source: "behavioral_inference", confidence: "low" });
    const weights = deriveNeighborhoodPreferenceWeights(profile);
    assert.ok(weights.family_fit > weights.animation);
  });

  it("does not silently convert preferences into must constraints", () => {
    let profile = createEmptyDynamicSearchProfileV2();
    profile = applySearchProfileEvent(profile, { type: "preference", key: "coastal_lifestyle", direction: "prefer_high", importance: "high" });
    assert.equal(profile.absolute_constraints.length, 0);
  });

  it("supports explicit anti-tourism tolerance independently of coastal preference", () => {
    let profile = createEmptyDynamicSearchProfileV2();
    profile = applySearchProfileEvent(profile, { type: "preference", key: "coastal_lifestyle", direction: "prefer_high", importance: "high" });
    profile = applySearchProfileEvent(profile, { type: "tourism_tolerance", max: 4 });
    assert.equal(profile.tolerances.tourism_intensity_max, 4);
    assert.equal(profile.neighborhood_preferences[0]?.key, "coastal_lifestyle");
  });

  it("rejects invalid numeric ranges", () => {
    assert.throws(() => applySearchProfileEvent(createEmptyDynamicSearchProfileV2(), { type: "budget", purchase_max_mad: -1 }));
    assert.throws(() => applySearchProfileEvent(createEmptyDynamicSearchProfileV2(), { type: "preference", key: "calmness", direction: "prefer_high", importance: "high", target: 11 }));
  });

  it("is a separate V2 contract and does not mutate the old frontend MVP", () => {
    const oldMvp = readFileSync(join(process.cwd(), "lib/search-profile/search-profile-types.ts"), "utf8");
    const v2 = readFileSync(join(process.cwd(), "lib/search-profile-v2/types.ts"), "utf8");
    assert.ok(oldMvp.includes("SEARCH-PROFILE-ONBOARDING-MVP-1"));
    assert.ok(v2.includes("DYNAMIC_SEARCH_PROFILE_VERSION"));
    assert.equal(v2.includes("type SearchAudience"), false);
  });
});
