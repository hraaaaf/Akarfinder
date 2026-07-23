import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { createCompanionSession, expectedCompanionEvents, transitionCompanionSession } from "../../../lib/companion-v1/state-machine.js";
import { applySearchProfileEvent } from "../../../lib/search-profile-v2/profile-engine.js";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Companion revision", () => {
  it("preserves the profile when the user chooses to revise it", () => {
    const base = createCompanionSession("2026-07-23T00:00:00Z");
    let profile = applySearchProfileEvent(base.profile, { type: "objective", value: "buy" });
    profile = applySearchProfileEvent(profile, { type: "uses", values: ["primary_residence"] });
    profile = applySearchProfileEvent(profile, { type: "cities", values: ["Rabat"] });
    profile = applySearchProfileEvent(profile, { type: "budget", purchase_max_mad: 1500000 });
    const recap = { ...base, state: "PROFIL_RECAP" as const, profile };
    assert.ok(expectedCompanionEvents("PROFIL_RECAP").includes("revise_profile"));
    const revised = transitionCompanionSession(recap, { type: "revise_profile" });
    assert.equal(revised.state, "OBJECTIF");
    assert.equal(revised.profile.objective?.value, "buy");
    assert.deepEqual(revised.profile.location.preferred_cities, ["Rabat"]);
  });

  it("replaces old preference selections on revision", () => {
    const base = createCompanionSession();
    let profile = applySearchProfileEvent(base.profile, { type: "preference", key: "calmness", direction: "prefer_high", importance: "high" });
    profile = applySearchProfileEvent(profile, { type: "preference", key: "walkability", direction: "prefer_high", importance: "high" });
    const next = transitionCompanionSession({ ...base, state: "PREFERENCES" as const, profile }, {
      type: "answer_preferences",
      preferences: [{ key: "walkability", direction: "prefer_high", importance: "high" }],
    });
    assert.deepEqual(next.profile.neighborhood_preferences.map((item) => item.key), ["walkability"]);
  });

  it("exposes a real prefilled edit action in the wizard", () => {
    const wizard = source("components/companion/CompanionWizard.tsx");
    assert.ok(wizard.includes("Modifier mes critères"));
    assert.ok(wizard.includes("prepareRevision"));
    assert.ok(wizard.includes('transition({ type: "revise_profile" })'));
    assert.ok(wizard.includes("profile.neighborhood_preferences.map"));
  });
});
