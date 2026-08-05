import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hero = readFileSync("components/home/GoogleLikeHero.tsx", "utf8");
const search = readFileSync("components/home/HomeSearchBar.tsx", "utf8");
const orchestrator = readFileSync("components/home/SearchEntryOrchestrator.tsx", "utf8");

test("hero states a clear user promise without unsupported market claims", () => {
  assert.match(hero, /Trouvez le bon bien, avec moins de bruit/);
  assert.match(hero, /gardez la source visible/);
  assert.doesNotMatch(hero, /1er moteur/);
  assert.match(hero, /aria-labelledby="home-hero-title"/);
});

test("primary search is a semantic and keyboard-operable form", () => {
  assert.match(search, /<form/);
  assert.match(search, /role="search"/);
  assert.match(search, /onSubmit=/);
  assert.match(search, /type="submit"/);
  assert.match(search, /aria-pressed=/);
  assert.match(search, /Ville, quartier, type de bien/);
});

test("mobile keeps a visible primary action and accessible touch targets", () => {
  assert.match(search, /<span>Rechercher<\/span>/);
  assert.match(search, /min-h-11/);
  assert.match(search, /min-h-10/);
});

test("secondary path uses user language instead of product jargon", () => {
  assert.match(orchestrator, /Je ne sais pas encore quoi chercher/);
  assert.doesNotMatch(orchestrator, /Lancer le Compagnon/);
});
