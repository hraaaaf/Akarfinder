import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { companionProfileToSearchParams } from "../../../lib/companion-v1/search-entry.js";
import { applySearchProfileEvent } from "../../../lib/search-profile-v2/profile-engine.js";
import { createEmptyDynamicSearchProfileV2 } from "../../../lib/search-profile-v2/types.js";

describe("#19G Homepage & Search Entry Orchestration V1", () => {
  it("exposes both canonical search entry choices from the homepage hero", () => {
    const source = readFileSync(join(process.cwd(), "components/home/SearchEntryOrchestrator.tsx"), "utf8");
    assert.ok(source.includes("Je sais ce que je cherche"));
    assert.ok(source.includes("Aidez-moi à trouver"));
    assert.ok(source.includes('href="/compagnon"'));
    assert.ok(source.includes("<HomeSearchBar"));
  });

  it("maps a confirmed guided profile to the existing search URL contract", () => {
    let profile = createEmptyDynamicSearchProfileV2("2026-07-22T00:00:00Z");
    profile = applySearchProfileEvent(profile, { type: "objective", value: "buy" });
    profile = applySearchProfileEvent(profile, { type: "cities", values: ["Rabat"] });
    profile = applySearchProfileEvent(profile, { type: "budget", purchase_max_mad: 1_500_000 });
    profile = applySearchProfileEvent(profile, { type: "property", property_types: ["Appartement"], min_surface_m2: 90 });
    const params = companionProfileToSearchParams(profile);
    assert.equal(params.get("city"), "Rabat");
    assert.equal(params.get("budget_max"), "1500000");
    assert.equal(params.get("property_type"), "Appartement");
    assert.equal(params.get("min_surface"), "90");
    assert.equal(params.get("guided"), "1");
  });

  it("keeps rent and new-build objectives compatible with search transaction types", () => {
    let rent = createEmptyDynamicSearchProfileV2();
    rent = applySearchProfileEvent(rent, { type: "objective", value: "rent" });
    rent = applySearchProfileEvent(rent, { type: "budget", rent_monthly_max_mad: 12_000 });
    assert.equal(companionProfileToSearchParams(rent).get("type"), "rent");
    assert.equal(companionProfileToSearchParams(rent).get("budget_max"), "12000");

    let fresh = createEmptyDynamicSearchProfileV2();
    fresh = applySearchProfileEvent(fresh, { type: "objective", value: "new_build" });
    assert.equal(companionProfileToSearchParams(fresh).get("type"), "new");
  });

  it("provides a real companion page backed by the structured wizard", () => {
    const page = readFileSync(join(process.cwd(), "app/compagnon/page.tsx"), "utf8");
    const wizard = readFileSync(join(process.cwd(), "components/companion/CompanionWizard.tsx"), "utf8");
    assert.ok(page.includes("<CompanionWizard"));
    assert.ok(wizard.includes("/api/companion/transition"));
    assert.ok(wizard.includes("companionProfileToSearchParams"));
    assert.equal(wizard.includes("persona"), false);
  });
});
