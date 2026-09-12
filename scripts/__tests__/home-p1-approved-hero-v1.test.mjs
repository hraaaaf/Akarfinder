import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/page.tsx", "utf8");
const hero = readFileSync("components/home/GoogleLikeHero.tsx", "utf8");
const search = readFileSync("components/home/HomeSearchBar.tsx", "utf8");
const orchestrator = readFileSync("components/home/SearchEntryOrchestrator.tsx", "utf8");
const trust = readFileSync("components/home/HomeTrustStrip.tsx", "utf8");
const actions = readFileSync("components/home/HomeActionGrid.tsx", "utf8");

test("approved strategic claim and decision copy remain unchanged", () => {
  assert.match(hero, /1er moteur de recherche immobilier au Maroc/);
  assert.match(hero, /Cherchez un bien, puis comprenez son quartier, son marché et la fiabilité de l’annonce avant de décider\./);
  assert.match(hero, /aria-labelledby="home-hero-title"/);
  assert.match(hero, /data-home-hero-mode="search-only-v1"/);
});

test("HOME V1 preserves the real hero photo and search-only responsive shell", () => {
  assert.match(hero, /akar-residence-sunset-desktop\.webp/);
  assert.match(hero, /akar-residence-sunset-mobile\.webp/);
  assert.match(hero, /linear-gradient/);
  assert.match(hero, /<SearchEntryOrchestrator \/>/);
  assert.doesNotMatch(hero, /HomeIntelligencePanel/);
  assert.doesNotMatch(hero, /min-h-\[760px\]/);
});

test("HOME V1 search exposes the approved intent-first entry", () => {
  const orderedLabels = ["Acheter", "Louer", "Neuf"];
  let previous = -1;
  for (const label of orderedLabels) {
    const current = search.indexOf(`label: "${label}"`);
    assert.ok(current > previous, `${label} must keep its approved order`);
    previous = current;
  }
  assert.match(search, /Ville, quartier ou référence/);
  assert.match(search, /<span>Rechercher<\/span>/);
  assert.match(search, /role="search"/);
  assert.match(search, /type="submit"/);
});

test("qualitative intelligence is exposed below the hero through the trust strip", () => {
  assert.match(trust, /data-home-trust-strip="v1"/);
  assert.match(trust, /Multi-source/);
  assert.match(trust, /Sources visibles/);
  assert.match(trust, /Marché & quartiers/);
  assert.doesNotMatch(trust, /1M\+/);
  assert.doesNotMatch(trust, /1 024 587/);
  assert.doesNotMatch(trust, /14 580 MAD/);
});

test("legacy Companion leaves the hero and Mon Projet remains an explicit secondary action", () => {
  assert.equal(orchestrator.split('href="/compagnon"').length - 1, 0);
  assert.doesNotMatch(orchestrator, /Construire mon projet/);
  assert.match(actions, /href: "\/mon-projet"/);
  assert.match(page, /<SiteHeader variant="light" compact \/>/);
});
