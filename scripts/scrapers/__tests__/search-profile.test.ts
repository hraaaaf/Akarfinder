import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSearchHref,
  buildSearchProfileSummary,
} from "../../../lib/search-profile/search-profile-summary.js";
import {
  AUDIENCE_OPTIONS,
  EMPTY_SEARCH_PROFILE,
  NEIGHBORHOOD_NEED_OPTIONS,
  PRIORITY_OPTIONS,
  PROJECT_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  type SearchProfile,
} from "../../../lib/search-profile/search-profile-types.js";

const FORBIDDEN_PUBLIC_TERMS = [
  "vérifié", "certifié", "officiel", "fiable", "meilleur", "garanti",
  "marketplace", "toutes les annonces", "exhaustif",
];

function familyBuyProfile(): SearchProfile {
  return {
    ...EMPTY_SEARCH_PROFILE,
    audience: "famille_enfants",
    project: "acheter",
    propertyType: "appartement",
    city: "Casablanca",
    neighborhood: "Maârif",
    budgetTotal: "1 500 000",
    purchaseHorizon: "6 à 12 mois",
    minSurface: "90",
    bedrooms: "3",
    elevator: true,
    neighborhoodNeeds: ["ecoles", "tram"],
    priorities: ["prix", "quartier"],
  };
}

describe("search profile summary", () => {
  it("builds a complete summary for a family purchase profile", () => {
    const summary = buildSearchProfileSummary(familyBuyProfile());
    const byLabel = Object.fromEntries(summary.lines.map((l) => [l.label, l.value]));
    assert.equal(byLabel["Profil"], "Famille avec enfants");
    assert.equal(byLabel["Projet"], "Acheter");
    assert.equal(byLabel["Type de bien"], "Appartement");
    assert.equal(byLabel["Zone"], "Maârif, Casablanca");
    assert.equal(byLabel["Budget indicatif"], "1 500 000 DH");
    assert.equal(byLabel["Horizon"], "6 à 12 mois");
    assert.ok(summary.essentials.includes("Surface min. 90 m²"));
    assert.ok(summary.essentials.includes("Écoles"));
    assert.ok(summary.essentials.includes("Priorité : Prix"));
    assert.ok(summary.checkpoints.length > 0);
  });

  it("uses monthly budget and rental checkpoints for a rent profile", () => {
    const summary = buildSearchProfileSummary({
      ...EMPTY_SEARCH_PROFILE,
      project: "louer",
      monthlyBudget: "8 000",
      moveInDate: "Septembre 2026",
    });
    const byLabel = Object.fromEntries(summary.lines.map((l) => [l.label, l.value]));
    assert.equal(byLabel["Budget indicatif"], "8 000 DH/mois");
    assert.equal(byLabel["Horizon"], "Septembre 2026");
    assert.ok(summary.checkpoints.some((c) => c.toLowerCase().includes("bail")));
  });

  it("handles an empty profile without crashing", () => {
    const summary = buildSearchProfileSummary(EMPTY_SEARCH_PROFILE);
    assert.equal(summary.lines.length, 0);
    assert.equal(summary.essentials.length, 0);
    assert.ok(summary.checkpoints.length > 0);
    assert.ok(summary.searchHref.startsWith("/search"));
  });

  it("builds a canonical structured search link and preserves richer intent", () => {
    const href = buildSearchHref(familyBuyProfile());
    const url = new URL(href, "https://akarfinder.test");
    assert.equal(url.pathname, "/search");
    assert.equal(url.searchParams.get("transaction_type"), "buy");
    assert.equal(url.searchParams.get("city"), "Casablanca");
    assert.equal(url.searchParams.get("property_type"), "Appartement");
    assert.equal(url.searchParams.get("q"), "Maârif");
    assert.equal(url.searchParams.get("max_price"), "1500000");
    assert.equal(url.searchParams.get("min_surface"), "90");
    assert.equal(url.searchParams.get("profile_bedrooms"), "3");
    assert.equal(url.searchParams.get("profile_elevator"), "1");
    assert.equal(url.searchParams.get("guided"), "1");
  });

  it("maps rent and new projects to canonical transaction_type params", () => {
    const rent = new URL(buildSearchHref({ ...EMPTY_SEARCH_PROFILE, project: "louer" }), "https://akarfinder.test");
    const fresh = new URL(buildSearchHref({ ...EMPTY_SEARCH_PROFILE, project: "neuf" }), "https://akarfinder.test");
    assert.equal(rent.searchParams.get("transaction_type"), "rent");
    assert.equal(fresh.searchParams.get("transaction_type"), "new");
    assert.equal(rent.searchParams.has("transaction"), false);
    assert.equal(fresh.searchParams.has("transaction"), false);
  });

  it("never emits forbidden public wording in options or summaries", () => {
    const corpus = [
      ...AUDIENCE_OPTIONS, ...PROJECT_OPTIONS, ...PROPERTY_TYPE_OPTIONS,
      ...NEIGHBORHOOD_NEED_OPTIONS, ...PRIORITY_OPTIONS,
    ].map((o) => o.label.toLowerCase());
    const summary = buildSearchProfileSummary(familyBuyProfile());
    corpus.push(
      ...summary.lines.map((l) => `${l.label} ${l.value}`.toLowerCase()),
      ...summary.essentials.map((e) => e.toLowerCase()),
      ...summary.checkpoints.map((c) => c.toLowerCase()),
    );
    for (const text of corpus) {
      for (const term of FORBIDDEN_PUBLIC_TERMS) {
        assert.equal(text.includes(term), false, `"${text}" must not contain "${term}"`);
      }
    }
  });
});
