import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import {
  getIndexedPropertyTypeVisual,
  INDEXED_PROPERTY_TYPE_VISUALS,
} from "../../../lib/ux/indexed-property-type-visual";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

describe("SEARCH-PROPERTY-TYPE-VISUALS-1", () => {
  it("resolves the six approved TARGET families", () => {
    assert.equal(getIndexedPropertyTypeVisual("Appartement").key, "apartment");
    assert.equal(getIndexedPropertyTypeVisual("Villa").key, "villa");
    assert.equal(getIndexedPropertyTypeVisual("Terrain").key, "land");
    assert.equal(getIndexedPropertyTypeVisual("Bureau").key, "office");
    assert.equal(getIndexedPropertyTypeVisual("Riad").key, "riad");
    assert.equal(
      getIndexedPropertyTypeVisual("Bureau", "Local commercial à vendre à Gauthier").key,
      "commercial",
    );
  });

  it("maps adjacent legacy types into the approved visual families without changing métier types", () => {
    assert.equal(getIndexedPropertyTypeVisual("Studio").key, "apartment");
    assert.equal(getIndexedPropertyTypeVisual("Maison").key, "villa");
    assert.equal(getIndexedPropertyTypeVisual("Studio", "Penthouse premium").key, "apartment");
  });

  it("recognizes safe commercial aliases from presentation text", () => {
    assert.equal(getIndexedPropertyTypeVisual("Bureau", "Boutique à vendre").key, "commercial");
    assert.equal(getIndexedPropertyTypeVisual("Bureau", "Magasin à louer").key, "commercial");
    assert.equal(getIndexedPropertyTypeVisual("Bureau", "Retail unit").key, "commercial");
  });

  it("keeps an explicit métier type ahead of incidental title vocabulary", () => {
    assert.equal(getIndexedPropertyTypeVisual("Appartement", "Appartement avec coin bureau").key, "apartment");
    assert.equal(getIndexedPropertyTypeVisual("Villa", "Villa proche des commerces").key, "villa");
    assert.equal(getIndexedPropertyTypeVisual("Terrain", "Terrain idéal pour bureaux").key, "land");
    assert.equal(getIndexedPropertyTypeVisual("Riad", "Riad avec boutique artisanale").key, "riad");
  });

  it("fails safely to a neutral visual", () => {
    assert.equal(getIndexedPropertyTypeVisual("Autre", "Bien atypique").key, "unknown");
    assert.equal(INDEXED_PROPERTY_TYPE_VISUALS.unknown.label, "Bien");
  });

  it("keeps one distinct canonical accent for each approved family", () => {
    const keys = ["apartment", "villa", "land", "office", "commercial", "riad"] as const;
    const accents = new Set(keys.map((key) => INDEXED_PROPERTY_TYPE_VISUALS[key].accent));
    assert.equal(accents.size, 6);
  });

  it("wires the real Search card to the property-type artwork instead of the legacy transaction component", () => {
    const card = source("components/search/SearchListingCardDark.tsx");
    assert.match(card, /IndexedPropertyTypeArtwork/);
    assert.match(card, /propertyType=\{listing\.property_type\}/);
    assert.match(card, /title=\{listing\.title\}/);
    assert.doesNotMatch(card, /from\s+["']@\/components\/search\/IndexedTransactionArtwork["']/);
    assert.doesNotMatch(card, /<IndexedTransactionArtwork\b/);
  });

  it("ships all six TARGET illustration branches and property-colored card selectors", () => {
    const artwork = source("components/search/IndexedPropertyTypeArtwork.tsx");
    for (const key of ["apartment", "villa", "land", "office", "commercial", "riad"] as const) {
      assert.match(artwork, new RegExp(`visual\\.key === \\"${key}\\"|data-indexed-property-artwork=\\{visual\\.key\\}`));
      assert.match(artwork, new RegExp(`data-indexed-property-artwork=\\"${key}\\"`));
    }
    assert.match(artwork, /Annonce indexée/);
    assert.match(artwork, /data-indexed-artwork-card/);
  });
});
