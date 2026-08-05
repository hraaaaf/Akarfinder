import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hero = readFileSync("components/home/GoogleLikeHero.tsx", "utf8");
const search = readFileSync("components/home/HomeSearchBar.tsx", "utf8");
const orchestrator = readFileSync("components/home/SearchEntryOrchestrator.tsx", "utf8");
const header = readFileSync("components/layout/SiteHeader.tsx", "utf8");

test("approved strategic claim and subtitle remain unchanged", () => {
  assert.match(hero, /1er moteur de recherche immobilier au Maroc/);
  assert.match(hero, /Une recherche plus claire, plus structurée et plus fiable pour l’immobilier au Maroc/);
  assert.match(hero, /aria-labelledby="home-hero-title"/);
});

test("approved visual treatment preserves photo and avoids opaque title panels", () => {
  assert.match(hero, /akar-residence-sunset-desktop\.webp/);
  assert.match(hero, /radial-gradient/);
  assert.match(hero, /drop-shadow/);
  assert.match(hero, /max-w-\[820px\]/);
  assert.doesNotMatch(hero, /bg-white[^\n]*home-hero-title/);
});

test("approved search wording and mobile action are present", () => {
  assert.match(search, /Ex\. appartement à Agdal, villa à Bouskoura…/);
  assert.match(search, /<span>Rechercher<\/span>/);
  assert.match(search, /role="search"/);
  assert.match(search, /type="submit"/);
});

test("approved chips and examples are locked", () => {
  const orderedLabels = ["Acheter", "Louer", "Neuf", "Villa", "Terrain", "Bureau", "Meublé"];
  let previous = -1;
  for (const label of orderedLabels) {
    const current = search.indexOf(`label: "${label}"`);
    assert.ok(current > previous, `${label} must keep its approved order`);
    previous = current;
  }
  assert.match(search, /Appartement à Agdal/);
  assert.match(search, /Villa avec piscine à Bouskoura/);
  assert.match(search, /Studio meublé à Maârif/);
  assert.match(search, /aria-pressed=/);
});

test("property chips preserve the selected buy or rent intent", () => {
  assert.match(search, /chip\.kind === "property"/);
  assert.match(search, /setPropertyType/);
  assert.doesNotMatch(search, /chip\.kind === "property"[\s\S]{0,240}setIntent/);
});

test("approved companion copy and header scroll behavior remain present", () => {
  assert.match(orchestrator, /Pas encore sûr de vos critères \? Construisez votre projet/);
  assert.match(header, /window\.scrollY > 60/);
  assert.match(header, /bg-\[rgba\(7,27,51,0\.97\)\]/);
});
