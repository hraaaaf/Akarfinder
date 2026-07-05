import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildSearchDemandProfile } from "../../../lib/demand/search-demand-profile.js";
import {
  EMPTY_SEARCH_PROFILE,
  type SearchProfile,
} from "../../../lib/search-profile/search-profile-types.js";

function familyProfile(): SearchProfile {
  return {
    ...EMPTY_SEARCH_PROFILE,
    audience: "famille_enfants",
    project: "acheter",
    propertyType: "appartement",
    city: "Casablanca",
    neighborhood: "Maârif",
    budgetTotal: "1 600 000",
    purchaseHorizon: "6 à 12 mois",
    minSurface: "90",
    bedrooms: "3",
    elevator: true,
    securedResidence: true,
    neighborhoodNeeds: ["ecoles", "tram"],
    priorities: ["quartier", "prix"],
  };
}

describe("search demand profile", () => {
  it("builds a structured demand from a search profile", () => {
    const demand = buildSearchDemandProfile(familyProfile());
    assert.equal(demand.profileLabel, "Famille avec enfants");
    assert.equal(demand.intentionLabel, "Acheter");
    assert.equal(demand.propertyTypeLabel, "Appartement");
    assert.equal(demand.zone, "Maârif, Casablanca");
    assert.equal(demand.budget, "1 600 000 DH");
    assert.equal(demand.surface, "90 m² min.");
    assert.equal(demand.urgency, "6 à 12 mois");
    assert.deepEqual(demand.priorities, ["Quartier", "Prix"]);
    assert.ok(demand.neighborhoodConstraints.includes("Écoles"));
    assert.ok(demand.nonNegotiables.includes("Résidence sécurisée"));
    assert.ok(demand.nonNegotiables.includes("3 chambre(s) minimum"));
  });

  it("uses monthly budget and move-in date for rental demands", () => {
    const demand = buildSearchDemandProfile({
      ...EMPTY_SEARCH_PROFILE,
      project: "louer",
      monthlyBudget: "8 000",
      moveInDate: "Septembre 2026",
    });
    assert.equal(demand.budget, "8 000 DH/mois");
    assert.equal(demand.urgency, "Septembre 2026");
  });

  it("never includes contact details without explicit consent", () => {
    const withoutConsent = buildSearchDemandProfile(familyProfile(), {
      name: "Test",
      reachVia: "email",
      consent: false,
    });
    assert.equal(withoutConsent.contact, null);
    assert.equal(withoutConsent.consentGiven, false);
  });

  it("includes contact details only with explicit consent", () => {
    const withConsent = buildSearchDemandProfile(familyProfile(), {
      name: "Test",
      reachVia: "email",
      consent: true,
    });
    assert.deepEqual(withConsent.contact, { name: "Test", reachVia: "email" });
    assert.equal(withConsent.consentGiven, true);
  });

  it("keeps the demand anonymous when consent is given but no details exist", () => {
    const demand = buildSearchDemandProfile(familyProfile(), {
      name: "",
      reachVia: "  ",
      consent: true,
    });
    assert.equal(demand.contact, null);
  });

  it("degrades gracefully on an empty profile", () => {
    const demand = buildSearchDemandProfile(EMPTY_SEARCH_PROFILE);
    assert.equal(demand.profileLabel, "Non précisé");
    assert.equal(demand.zone, "Non précisée");
    assert.equal(demand.budget, "Non précisé");
    assert.deepEqual(demand.priorities, []);
    assert.equal(demand.contact, null);
  });
});
