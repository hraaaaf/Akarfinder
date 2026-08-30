import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import {
  getIndexedPropertyTypeVisual,
  INDEXED_PROPERTY_TYPE_VISUALS,
} from "../../../lib/ux/indexed-property-type-visual";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");
const bytes = (path: string) => readFileSync(resolve(ROOT, path));

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

  it("keeps the indexed source footer actionable for observed external listings", () => {
    const card = source("components/search/SearchListingCardDark.tsx");
    assert.match(card, /showOriginal && \(!observedExternal \|\| useIndexedArtwork\)/);
    assert.match(card, /data-secondary-source-link/);
    assert.match(card, /href=\{listing\.listing_url!\}/);
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

  it("keeps locked TARGET assets local and prevents the broken nested Riad image regression", () => {
    const css = source("app/search/search-property-type-target-art.css");
    for (const key of ["apartment", "villa", "land", "office", "commercial"] as const) {
      const asset = `public/visuals/property-types/target/${key}.svg`;
      assert.equal(existsSync(resolve(ROOT, asset)), true, `${key} TARGET asset missing`);
      assert.match(css, new RegExp(`/visuals/property-types/target/${key}\\.svg`));
      assert.doesNotMatch(source(asset), /(?:href|src)=["']https?:\/\//i, `${key} TARGET asset must not load an external URL`);
    }

    const riadPath = "public/visuals/property-types/target/riad.png";
    assert.equal(existsSync(resolve(ROOT, riadPath)), true, "Riad TARGET PNG missing");
    const riad = bytes(riadPath);
    assert.equal(riad.length > 1000, true, "Riad TARGET PNG is unexpectedly small");
    assert.deepEqual(
      Array.from(riad.subarray(0, 8)),
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      "Riad TARGET asset must be a valid PNG payload",
    );
    assert.match(css, /\/visuals\/property-types\/target\/riad\.png/);
    assert.doesNotMatch(css, /\/visuals\/property-types\/target\/riad\.svg/);
  });
});
