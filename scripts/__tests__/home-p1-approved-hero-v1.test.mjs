import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/page.tsx", "utf8");
const hero = readFileSync("components/home/GoogleLikeHero.tsx", "utf8");
const intelligence = readFileSync("components/home/HomeIntelligencePanel.tsx", "utf8");
const search = readFileSync("components/home/HomeSearchBar.tsx", "utf8");
const orchestrator = readFileSync("components/home/SearchEntryOrchestrator.tsx", "utf8");

test("approved strategic claim and decision copy remain unchanged", () => {
  assert.match(hero, /1er moteur de recherche immobilier au Maroc/);
  assert.match(hero, /Cherchez un bien, puis comprenez son quartier, son marché et la fiabilité de l’annonce avant de décider\./);
  assert.match(hero, /aria-labelledby="home-hero-title"/);
  assert.match(hero, /data-home-hero="p1-a1"/);
});

test("HVR-1 preserves the real hero photo and compact responsive shell", () => {
  assert.match(hero, /akar-residence-sunset-desktop\.webp/);
  assert.match(hero, /akar-residence-sunset-mobile\.webp/);
  assert.match(hero, /linear-gradient/);
  assert.match(hero, /data-home-hero-layout="hvr-1"/);
  assert.match(hero, /lg:grid-cols-/);
  assert.doesNotMatch(hero, /min-h-\[760px\]/);
});

test("HVR-1 search exposes the approved intent-first entry", () => {
  const orderedLabels = ["Acheter", "Louer", "Neuf"];
  let previous = -1;
  for (const label of orderedLabels) {
    const current = search.indexOf(`label: "${label}"`);
    assert.ok(current > previous, `${label} must keep its HVR-1 order`);
    previous = current;
  }
  assert.match(search, /Ville, quartier ou référence/);
  assert.match(search, /<span>Rechercher<\/span>/);
  assert.match(search, /role="search"/);
  assert.match(search, /type="submit"/);
  assert.match(search, /aria-pressed=/);
  assert.doesNotMatch(search, /label: "Villa"/);
  assert.doesNotMatch(search, /label: "Terrain"/);
  assert.doesNotMatch(search, /label: "Bureau"/);
  assert.doesNotMatch(search, /label: "Meublé"/);
});

test("HVR-1 intelligence stays qualitative and truth-safe", () => {
  assert.match(intelligence, /AkarFinder Intelligence/);
  assert.match(intelligence, /Prix et offres visibles dans les résultats/);
  assert.match(intelligence, /Source et fraîcheur affichées quand disponibles/);
  assert.match(intelligence, /href="\/map"/);
  assert.doesNotMatch(intelligence, /1M\+/);
  assert.doesNotMatch(intelligence, /1 024 587/);
  assert.doesNotMatch(intelligence, /14 580 MAD/);
});

test("Companion remains a single secondary entry and homepage header is white", () => {
  assert.equal(orchestrator.split('href="/compagnon"').length - 1, 1);
  assert.match(orchestrator, /Construire mon projet/);
  assert.match(page, /<SiteHeader variant="light" compact \/>/);
});
