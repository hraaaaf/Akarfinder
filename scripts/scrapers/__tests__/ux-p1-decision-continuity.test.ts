import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(path, "utf8");
}

test("listing detail starts with one canonical decision layer", () => {
  const page = source("app/listings/[id]/page.tsx");
  const decision = source("components/listings/PropertyDecisionHeader.tsx");

  assert.ok(page.includes("<PropertyDecisionHeader listing={listing} detail={detail} />"));
  assert.ok(
    page.indexOf("<PropertyDecisionHeader") < page.indexOf("<PropertyDetailV2"),
    "decision layer must precede the detailed dossier",
  );
  assert.ok(decision.includes('aria-labelledby="property-decision-title"'));
  assert.ok(decision.includes("Votre prochaine décision"));
});

test("decision actions preserve the canonical project, favorite and comparison flows", () => {
  const decision = source("components/listings/PropertyDecisionHeader.tsx");

  assert.ok(decision.includes('href="/mon-projet"'));
  assert.ok(decision.includes("Continuer dans Mon Projet"));
  assert.ok(decision.includes("FavoriteToggleButton"));
  assert.ok(decision.includes("CompareToggleButton"));
  assert.ok(!decision.includes("/profil-recherche"));
  assert.ok(!decision.includes("/onboarding"));
});

test("decision summary remains evidence-safe", () => {
  const decision = source("components/listings/PropertyDecisionHeader.tsx");

  assert.ok(decision.includes("detail.provenance.fact_provenance_label"));
  assert.ok(decision.includes("detail.conclusion.attention_label"));
  assert.ok(decision.includes("il ne certifie ni le bien ni la transaction"));
  assert.ok(!decision.includes("bien vérifié"));
  assert.ok(!decision.includes("meilleure affaire"));
});
