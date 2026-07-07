import test from "node:test";
import assert from "node:assert/strict";

import { buildPublicResultChecklist } from "@/lib/public-result-checklist/build-checklist";
import { assertPublicResultChecklistSafety } from "@/lib/public-result-checklist/public-safety";
import {
  FORBIDDEN_PUBLIC_RESULT_CHECKLIST_WORDING,
  PUBLIC_RESULT_CHECKLIST_MAX_ITEMS,
} from "@/lib/public-result-checklist/checklist-rules";
import { buildAkarInfoPassportForGatewayResult } from "@/lib/akarinfo/akarinfo-passport";
import type { PublicResultSimilaritySummary } from "@/lib/public-result-similarity/types";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";

function createGatewayResult(
  overrides: Partial<SearchGatewayNormalizedResult> = {},
): SearchGatewayNormalizedResult {
  return {
    id: "gw-checklist-1",
    title: "Appartement 3 pièces Casablanca Maarif",
    snippet: "Bel appartement lumineux proche des commerces, 2 chambres, parking.",
    original_url: "https://www.mubawab.ma/fr/a/checklist-listing-1",
    display_url: "mubawab.ma/fr/a/checklist-listing-1",
    source_id: "mubawab_serper",
    source_name: "Mubawab",
    domain: "mubawab.ma",
    result_origin: "search_api",
    search_result_display_mode: "thin_indexed_result",
    source_badge: "public_indexed",
    production_allowed: true,
    can_show_result: true,
    can_show_thumbnail: false,
    can_show_contact: false,
    can_show_gallery: false,
    can_cache_thumbnail: false,
    can_download_thumbnail: false,
    primary_cta: "view_original",
    primary_cta_label: "Voir l'annonce originale",
    result_attribution_label: "Source originale",
    thumbnail_risk_accepted: false,
    ...overrides,
  };
}

test("standard gateway result yields a checklist with 3 to 5 items", () => {
  const checklist = buildPublicResultChecklist({
    title: "Appartement 3 pièces Casablanca Maarif",
    snippet: "Bel appartement lumineux proche des commerces, 2 chambres, parking.",
    original_url: "https://www.mubawab.ma/fr/a/checklist-listing-1",
  });

  assert.ok(checklist);
  assert.equal(checklist?.title, "Points à vérifier");
  assert.equal(checklist?.help_label, "Avant de contacter");
  assert.ok(checklist!.items.length >= 3);
  assert.ok(checklist!.items.length <= 5);
});

test("result with little information gets the limited-information item", () => {
  const checklist = buildPublicResultChecklist({
    title: "Appartement Casablanca",
    snippet: "",
    original_url: "https://www.mubawab.ma/fr/a/checklist-listing-2",
  });

  assert.ok(checklist);
  assert.equal(checklist!.items[0].category, "source");
  assert.match(checklist!.items[0].label, /Informations limitées/i);
});

test("result with similar_possible gets a similarity comparison item", () => {
  const checklist = buildPublicResultChecklist({
    title: "Appartement Casablanca",
    snippet: "Appartement proche du centre-ville avec balcon et parking.",
    original_url: "https://www.mubawab.ma/fr/a/checklist-listing-3",
    similar_possible: true,
  });

  assert.ok(checklist);
  const similarityItem = checklist!.items.find((item) => item.category === "similarity");
  assert.ok(similarityItem);
  assert.match(similarityItem!.label, /résultats similaires possibles/i);
});

test("result with observation labels gets a freshness confirmation item", () => {
  const checklist = buildPublicResultChecklist({
    title: "Appartement Casablanca",
    snippet: "Appartement proche du centre-ville avec balcon et parking.",
    original_url: "https://www.mubawab.ma/fr/a/checklist-listing-4",
    observation_labels: ["Observé pendant cette recherche", "Source originale à confirmer"],
  });

  assert.ok(checklist);
  const freshnessItem = checklist!.items.find((item) => item.category === "freshness");
  assert.ok(freshnessItem);
  assert.match(freshnessItem!.label, /à confirmer sur la source originale/i);
});

test("checklist never exceeds the max item count even with every signal present", () => {
  const checklist = buildPublicResultChecklist({
    title: "Appartement Casablanca",
    snippet: "Appartement proche du centre-ville avec balcon et parking.",
    original_url: "https://www.mubawab.ma/fr/a/checklist-listing-5",
    similar_possible: true,
    observation_labels: ["Observé plusieurs fois"],
  });

  assert.ok(checklist);
  assert.equal(checklist!.items.length, PUBLIC_RESULT_CHECKLIST_MAX_ITEMS);
});

test("checklist contains no forbidden wording", () => {
  const checklist = buildPublicResultChecklist({
    title: "Appartement Casablanca",
    snippet: "Appartement proche du centre-ville avec balcon et parking.",
    original_url: "https://www.mubawab.ma/fr/a/checklist-listing-6",
    similar_possible: true,
    observation_labels: ["Observé récemment"],
  });

  assert.ok(checklist);
  assert.doesNotThrow(() => assertPublicResultChecklistSafety(checklist!));

  const serialized = JSON.stringify(checklist).toLowerCase();
  const forbiddenHit = FORBIDDEN_PUBLIC_RESULT_CHECKLIST_WORDING.some((term) =>
    serialized.includes(term.toLowerCase()),
  );
  assert.equal(forbiddenHit, false);
});

test("checklist never contains a numeric score", () => {
  const checklist = buildPublicResultChecklist({
    title: "Appartement Casablanca",
    snippet: "Appartement proche du centre-ville avec balcon et parking.",
    original_url: "https://www.mubawab.ma/fr/a/checklist-listing-7",
  });

  assert.ok(checklist);
  for (const item of checklist!.items) {
    assert.doesNotMatch(item.label, /\d{1,3}\s*(\/\s*(10|20|100)\b|%)/);
  }
});

test("checklist never uses contact, gallery, or dataset price fields", () => {
  const checklist = buildPublicResultChecklist({
    title: "Appartement Casablanca",
    snippet: "Appartement proche du centre-ville avec balcon et parking.",
    original_url: "https://www.mubawab.ma/fr/a/checklist-listing-8",
  });

  assert.ok(checklist);
  const serialized = JSON.stringify(checklist).toLowerCase();
  for (const forbiddenKey of [
    "contact",
    "gallery",
    "image",
    "phone",
    "email",
    "value_low",
    "value_median",
    "value_high",
    "evidence_ref",
  ]) {
    assert.equal(serialized.includes(`"${forbiddenKey}"`), false);
  }
});

test("no title or original_url => no checklist, never crashes", () => {
  assert.equal(buildPublicResultChecklist({ title: "" }), null);
  assert.equal(
    buildPublicResultChecklist({ title: "Appartement", original_url: undefined }),
    null,
  );
});

test("assertPublicResultChecklistSafety throws when max item count exceeded", () => {
  assert.throws(() =>
    assertPublicResultChecklistSafety({
      title: "Points à vérifier",
      help_label: "Avant de contacter",
      items: [
        { category: "source", label: "a" },
        { category: "price", label: "b" },
        { category: "surface", label: "c" },
        { category: "photos", label: "d" },
        { category: "location", label: "e" },
        { category: "freshness", label: "f" },
      ],
    }),
  );
});

test("gateway AkarInfo passport carries a safe checklist with no dataset/contact leak", () => {
  const passport = buildAkarInfoPassportForGatewayResult(createGatewayResult());

  assert.ok(passport.checklist);
  assert.doesNotThrow(() => assertPublicResultChecklistSafety(passport.checklist!));
  assert.ok(passport.checklist!.items.length >= 3);
  assert.ok(passport.checklist!.items.length <= 5);
});

test("gateway AkarInfo passport checklist reacts to similar_possible signal", () => {
  const similarResults: PublicResultSimilaritySummary = {
    similar_possible: true,
    similar_count: 2,
    similar_public_label: "Résultat similaire possible",
    similar_reasons_public: ["Même ville", "Prix proche"],
  };

  const passport = buildAkarInfoPassportForGatewayResult(
    createGatewayResult({ id: "gw-checklist-9" }),
    similarResults,
  );

  assert.ok(passport.checklist);
  const hasSimilarityItem = passport.checklist!.items.some(
    (item) => item.category === "similarity",
  );
  assert.equal(hasSimilarityItem, true);
});
