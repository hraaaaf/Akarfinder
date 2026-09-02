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
import { companionProfileToSearchParams } from "../../../lib/companion-v1/search-entry.js";
import { createCompanionSession, transitionCompanionSession } from "../../../lib/companion-v1/state-machine.js";
import { applySearchProfileEvent } from "../../../lib/search-profile-v2/profile-engine.js";
import { createEmptyDynamicSearchProfileV2 } from "../../../lib/search-profile-v2/types.js";

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

function companionAtPreferences() {
  let session = createCompanionSession("2026-09-02T10:00:00.000Z");
  session = transitionCompanionSession(session, { type: "start" }, "2026-09-02T10:00:01.000Z");
  session = transitionCompanionSession(session, { type: "answer_objective", objective: "buy" }, "2026-09-02T10:00:02.000Z");
  session = transitionCompanionSession(session, { type: "answer_usage", intended_uses: ["primary_residence"] }, "2026-09-02T10:00:03.000Z");
  session = transitionCompanionSession(session, { type: "answer_location", cities: ["Casablanca"] }, "2026-09-02T10:00:04.000Z");
  session = transitionCompanionSession(session, { type: "answer_budget", purchase_max_mad: 1_500_000 }, "2026-09-02T10:00:05.000Z");
  session = transitionCompanionSession(session, { type: "answer_type", property_types: ["Appartement"] }, "2026-09-02T10:00:06.000Z");
  return transitionCompanionSession(session, { type: "answer_constraints", min_surface_m2: 90, min_bedrooms: 3 }, "2026-09-02T10:00:07.000Z");
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

describe("Mon Projet Dynamic Search Profile V2", () => {
  it("writes explicit personal context with provenance and supports partial updates", () => {
    const now = "2026-09-02T11:00:00.000Z";
    const profile = applySearchProfileEvent(createEmptyDynamicSearchProfileV2(), {
      type: "personal_context",
      children_count: 2,
      remote_work: true,
      accessibility_need: false,
    }, now);

    assert.deepEqual(profile.personal_context.children_count, {
      value: 2,
      source: "explicit",
      confidence: "high",
      updated_at: now,
    });
    assert.equal(profile.personal_context.remote_work?.value, true);
    assert.equal(profile.personal_context.accessibility_need?.value, false);

    const inferred = applySearchProfileEvent(profile, {
      type: "personal_context",
      corporate_context: true,
      source: "behavioral_inference",
    }, "2026-09-02T11:01:00.000Z");
    assert.equal(inferred.personal_context.corporate_context?.confidence, "low");
    assert.equal(inferred.personal_context.children_count?.value, 2);
  });

  it("rejects invalid personal context", () => {
    assert.throws(
      () => applySearchProfileEvent(createEmptyDynamicSearchProfileV2(), { type: "personal_context", children_count: 21 }),
      /PROFILE_CHILDREN_COUNT_INVALID/,
    );
  });

  it("keeps context and anchors inside the historical Companion sequence", () => {
    let session = companionAtPreferences();
    assert.equal(session.state, "PREFERENCES");

    session = transitionCompanionSession(session, { type: "answer_context", children_count: 2 }, "2026-09-02T10:00:08.000Z");
    session = transitionCompanionSession(session, { type: "answer_context", remote_work: true }, "2026-09-02T10:00:09.000Z");
    assert.equal(session.state, "PREFERENCES");
    assert.equal(session.profile.personal_context.children_count?.value, 2);
    assert.equal(session.profile.personal_context.remote_work?.value, true);

    session = transitionCompanionSession(session, {
      type: "answer_anchors",
      anchors: [
        { label: " École des enfants ", city: "Casablanca", max_minutes: 15 },
        { label: "École des enfants", city: "Casablanca", max_minutes: 15 },
      ],
    }, "2026-09-02T10:00:10.000Z");
    assert.equal(session.profile.location.anchors.length, 1);
    assert.deepEqual(session.profile.location.anchors[0], { label: "École des enfants", city: "Casablanca", max_minutes: 15 });

    session = transitionCompanionSession(session, { type: "answer_preferences", preferences: [] }, "2026-09-02T10:00:11.000Z");
    assert.equal(session.state, "PRIORISATION");
    assert.equal(session.profile.personal_context.children_count?.value, 2);
    assert.equal(session.profile.location.anchors.length, 1);
  });

  it("rejects invalid anchors", () => {
    assert.throws(
      () => applySearchProfileEvent(createEmptyDynamicSearchProfileV2(), {
        type: "anchors",
        values: [{ label: "Bureau", city: "Casablanca", max_minutes: 0 }],
      }),
      /PROFILE_ANCHOR_MAX_MINUTES_INVALID/,
    );
  });

  it("preserves anchors, personal context and rich tolerances in Search hand-off", () => {
    let profile = companionAtPreferences().profile;
    profile = applySearchProfileEvent(profile, {
      type: "personal_context",
      children_count: 2,
      remote_work: true,
    }, "2026-09-02T11:10:00.000Z");
    profile = applySearchProfileEvent(profile, {
      type: "anchors",
      values: [{ label: "Bureau", city: "Casablanca", max_minutes: 20 }],
    }, "2026-09-02T11:11:00.000Z");
    profile = applySearchProfileEvent(profile, { type: "tourism_tolerance", max: 3 }, "2026-09-02T11:12:00.000Z");

    const params = companionProfileToSearchParams(profile);
    assert.equal(params.get("transaction_type"), "buy");
    assert.equal(params.get("city"), "Casablanca");
    assert.equal(params.get("max_price"), "1500000");
    assert.equal(params.get("guided"), "1");

    const anchors = JSON.parse(params.get("profile_anchors") ?? "[]") as Array<{ label: string; max_minutes?: number }>;
    assert.deepEqual(anchors, [{ label: "Bureau", city: "Casablanca", max_minutes: 20 }]);

    const context = JSON.parse(params.get("profile_personal_context") ?? "{}") as { children_count?: { value: number }; remote_work?: { value: boolean } };
    assert.equal(context.children_count?.value, 2);
    assert.equal(context.remote_work?.value, true);

    const tolerances = JSON.parse(params.get("profile_tolerances") ?? "{}") as { tourism_intensity_max?: number };
    assert.equal(tolerances.tourism_intensity_max, 3);
  });
});
