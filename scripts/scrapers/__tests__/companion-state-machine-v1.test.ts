import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildNeighborhoodIntelligenceV2FromV1 } from "../../../lib/neighborhood-intelligence/build-v2-from-v1.js";
import { createCompanionSession, transitionCompanionSession, COMPANION_STATES } from "../../../lib/companion-v1/state-machine.js";
import { rankNeighborhoodsForProfile } from "../../../lib/companion-v1/search-orchestrator.js";

describe("#19F Compagnon AkarFinder State Machine V1", () => {
  it("uses the exact canonical state sequence", () => {
    assert.deepEqual(COMPANION_STATES, [
      "ENTRY","OBJECTIF","USAGE","LOCALISATION","BUDGET","TYPE","CONTRAINTES_ABSOLUES","PREFERENCES","PRIORISATION","COMPROMIS","PROFIL_RECAP","RECHERCHE","TRI_PAR_ELIMINATION","AFFINAGE","NOUVELLE_RECHERCHE",
    ]);
  });

  it("rejects out-of-order free-form transitions", () => {
    const session = createCompanionSession();
    assert.throws(() => transitionCompanionSession(session, { type: "answer_budget", purchase_max_mad: 1_000_000 }));
  });

  it("each structured answer updates SearchProfile and moves one deterministic state", () => {
    let s = createCompanionSession("2026-07-22T00:00:00Z");
    s = transitionCompanionSession(s, { type: "start" });
    assert.equal(s.state, "OBJECTIF");
    s = transitionCompanionSession(s, { type: "answer_objective", objective: "buy" });
    assert.equal(s.state, "USAGE");
    assert.equal(s.profile.objective?.value, "buy");
    s = transitionCompanionSession(s, { type: "answer_usage", intended_uses: ["primary_residence","family_housing"] });
    s = transitionCompanionSession(s, { type: "answer_location", cities: ["Casablanca"] });
    s = transitionCompanionSession(s, { type: "answer_budget", purchase_max_mad: 1_800_000 });
    s = transitionCompanionSession(s, { type: "answer_type", property_types: ["apartment"] });
    s = transitionCompanionSession(s, { type: "answer_constraints", min_surface_m2: 90, min_bedrooms: 3, required_features: ["parking"] });
    s = transitionCompanionSession(s, { type: "answer_preferences", preferences: [
      { key: "calmness", direction: "prefer_high", importance: "high" },
      { key: "family_fit", direction: "prefer_high", importance: "high" },
      { key: "coastal_lifestyle", direction: "prefer_high", importance: "medium" },
      { key: "tourism_intensity", direction: "prefer_low", importance: "high" },
    ] });
    s = transitionCompanionSession(s, { type: "answer_priorities", priorities: ["calmness","family_fit","budget"] });
    s = transitionCompanionSession(s, { type: "answer_compromise", tourism_intensity_max: 4 });
    assert.equal(s.state, "PROFIL_RECAP");
    assert.equal(s.profile.tolerances.tourism_intensity_max, 4);
    s = transitionCompanionSession(s, { type: "confirm_profile" });
    assert.equal(s.state, "RECHERCHE");
  });

  it("refuses search confirmation when minimum project context is missing", () => {
    const session = { ...createCompanionSession(), state: "PROFIL_RECAP" as const };
    assert.throws(() => transitionCompanionSession(session, { type: "confirm_profile" }), /COMPANION_PROFILE_NOT_READY/);
  });

  it("implements elimination → refinement → new search loop", () => {
    let s: ReturnType<typeof createCompanionSession> = { ...createCompanionSession(), state: "RECHERCHE" };
    s = transitionCompanionSession(s, { type: "search_completed", property_ids: ["a","b"] });
    assert.equal(s.state, "TRI_PAR_ELIMINATION");
    s = transitionCompanionSession(s, { type: "elimination_completed", eliminated_property_ids: ["b"] });
    assert.equal(s.state, "AFFINAGE");
    s = transitionCompanionSession(s, { type: "refine", profile_events: [{ type: "preference", key: "walkability", direction: "prefer_high", importance: "medium" }] });
    assert.equal(s.state, "NOUVELLE_RECHERCHE");
    s = transitionCompanionSession(s, { type: "restart_search" });
    assert.equal(s.state, "RECHERCHE");
    assert.ok(s.eliminated_property_ids.includes("b"));
  });

  it("does not eliminate neighborhoods merely because V2 lifestyle evidence is unknown", () => {
    const s = createCompanionSession();
    s.profile.location.preferred_cities = ["Casablanca"];
    s.profile.neighborhood_preferences = [{ key: "family_fit", direction: "prefer_high", importance: "high", target: null, signal: { value: true, source: "explicit", confidence: "high", updated_at: s.last_transition_at } }];
    const ranked = rankNeighborhoodsForProfile(s.profile, buildNeighborhoodIntelligenceV2FromV1().filter((n) => n.city === "Casablanca"));
    assert.ok(ranked.length > 0);
    assert.ok(ranked.every((n) => n.eligible));
    assert.ok(ranked.every((n) => n.score === null));
  });
});
