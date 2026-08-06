import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { companionProfileToSearchParams } from "../../../lib/companion-v1/search-entry.js";
import { applySearchProfileEvent } from "../../../lib/search-profile-v2/profile-engine.js";
import { createEmptyDynamicSearchProfileV2 } from "../../../lib/search-profile-v2/types.js";

describe("#19G Homepage & Search Entry Orchestration V1", () => {
  it("exposes direct search and the canonical guided project entry from the homepage hero", () => {
    const source = readFileSync(join(process.cwd(), "components/home/SearchEntryOrchestrator.tsx"), "utf8");
    assert.ok(source.includes("<HomeSearchBar"));
    assert.ok(source.includes('href="/compagnon"'));
    assert.ok(source.includes("Pas encore sûr de vos critères ? Construisez votre projet"));
  });

  it("maps a confirmed guided profile to the canonical structured search URL contract", () => {
    let profile = createEmptyDynamicSearchProfileV2("2026-07-22T00:00:00Z");
    profile = applySearchProfileEvent(profile, { type: "objective", value: "buy" });
    profile = applySearchProfileEvent(profile, { type: "cities", values: ["Rabat"] });
    profile = applySearchProfileEvent(profile, { type: "budget", purchase_max_mad: 1_500_000 });
    profile = applySearchProfileEvent(profile, { type: "property", property_types: ["Appartement"], min_surface_m2: 90 });
    const params = companionProfileToSearchParams(profile);
    assert.equal(params.get("transaction_type"), "buy");
    assert.equal(params.get("city"), "Rabat");
    assert.equal(params.get("max_price"), "1500000");
    assert.equal(params.get("property_type"), "Appartement");
    assert.equal(params.get("min_surface"), "90");
    assert.equal(params.get("guided"), "1");
    assert.equal(params.has("type"), false);
    assert.equal(params.has("budget_max"), false);
  });

  it("keeps rent and new-build objectives compatible with canonical search transaction types", () => {
    let rent = createEmptyDynamicSearchProfileV2();
    rent = applySearchProfileEvent(rent, { type: "objective", value: "rent" });
    rent = applySearchProfileEvent(rent, { type: "budget", rent_monthly_max_mad: 12_000 });
    const rentParams = companionProfileToSearchParams(rent);
    assert.equal(rentParams.get("transaction_type"), "rent");
    assert.equal(rentParams.get("max_price"), "12000");

    let fresh = createEmptyDynamicSearchProfileV2();
    fresh = applySearchProfileEvent(fresh, { type: "objective", value: "new_build" });
    assert.equal(companionProfileToSearchParams(fresh).get("transaction_type"), "new");
  });

  it("provides a real canonical Mon Projet page backed by the structured state machine and continuity handoff", () => {
    const legacyPage = readFileSync(join(process.cwd(), "app/compagnon/page.tsx"), "utf8");
    const projectPage = readFileSync(join(process.cwd(), "app/mon-projet/page.tsx"), "utf8");
    const wizard = readFileSync(join(process.cwd(), "components/companion/MonProjetWizardP1A.tsx"), "utf8");
    assert.ok(legacyPage.includes('permanentRedirect("/mon-projet")'));
    assert.ok(projectPage.includes("<MonProjetWizardP1A"));
    assert.ok(wizard.includes("/api/companion/transition"));
    assert.ok(wizard.includes("companionProfileToSearchParams"));
    assert.ok(wizard.includes("/api/me/continuity"));
    assert.equal(wizard.includes("persona"), false);
  });
});