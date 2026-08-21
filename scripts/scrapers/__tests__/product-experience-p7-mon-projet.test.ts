import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const wizardPath = "components/companion/MonProjetWizardP1A.tsx";
const pagePath = "app/mon-projet/page.tsx";

test("P7 keeps the 8-step Mon Projet state machine and truth-safe transitions", async () => {
  const source = await readFile(wizardPath, "utf8");
  assert.match(source, /const TOTAL_STEPS = 8/);
  assert.match(source, /answer_objective/);
  assert.match(source, /answer_usage/);
  assert.match(source, /answer_location/);
  assert.match(source, /answer_budget/);
  assert.match(source, /answer_type/);
  assert.match(source, /answer_preferences/);
  assert.match(source, /answer_priorities/);
  assert.match(source, /answer_compromise/);
  assert.match(source, /confirm_profile/);
  assert.match(source, /companionProfileToSearchParams/);
});

test("P7 initial screen is one question with four canonical primary objectives", async () => {
  const source = await readFile(wizardPath, "utf8");
  assert.match(source, /Une question à la fois\. Vos réponses deviennent directement des critères de recherche\./);
  assert.match(source, /PRIMARY_OBJECTIVES = OBJECTIVES\.filter\(\(item\) => item\.value !== "explore"\)/);
  assert.match(source, /data-p7-primary-objective/);
  assert.match(source, /data-p7-explore-secondary/);
  assert.match(source, /projectQuestion/);
  assert.match(source, /setProjectQuestion\("usage"\)/);
});

test("P7 exposes the canonical responsive progress rail without duplicating page chrome", async () => {
  const source = await readFile(wizardPath, "utf8");
  const page = await readFile(pagePath, "utf8");
  assert.match(source, /data-p7-progress-rail/);
  assert.match(source, /data-p7-progress-mobile/);
  assert.match(source, /lg:grid-cols-\[220px_minmax\(0,1fr\)\]/);
  assert.match(source, /Mes projets enregistrés/);
  assert.doesNotMatch(page, /Retrouver mes projets enregistrés/);
});
