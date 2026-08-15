import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const doc = readFileSync("docs/CARTE_C1A_GEOMETRY_SOURCE_QUALIFICATION.md", "utf8");

const zones = ["Agdal", "Hay Riad", "Souissi", "Rabat Centre"];

describe("Carte C1A geometry source qualification", () => {
  it("keeps all target zones fail-closed", () => {
    for (const zone of zones) assert.ok(doc.includes(zone), `missing ${zone}`);
    const blocked = doc.match(/\*\*BLOCKED/g) ?? [];
    assert.ok(blocked.length >= 4, `expected >=4 blocked target zones, got ${blocked.length}`);
  });

  it("qualifies primary sources without overclaiming extraction", () => {
    assert.match(doc, /ANCFCC \/ DGI/);
    assert.match(doc, /QUALIFIED FOR ZONING CONCEPT, GEOMETRY EXTRACTION NOT YET QUALIFIED/);
    assert.match(doc, /Agence Urbaine de Rabat-Salé/);
    assert.match(doc, /QUALIFIED FOR PLANNING\/CONTAINER GEOMETRY, SUB-NEIGHBORHOOD EXTRACTION NOT YET QUALIFIED/);
  });

  it("forbids administrative shortcuts and point-to-polygon fabrication", () => {
    assert.match(doc, /un point lat\/lng ne devient jamais un polygone/);
    assert.match(doc, /un arrondissement ne peut pas être renommé en quartier/);
    assert.match(doc, /Agdal-Ryad.*deux quartiers arbitraires `Agdal` et `Hay Riad`/s);
    assert.match(doc, /REJECTED_AS_POLYGON_EVIDENCE/);
  });

  it("keeps official tax reference values separate from AkarFinder market medians", () => {
    assert.match(doc, /Usage interdit : utiliser directement les valeurs fiscales ANCFCC comme notre `price_median_mad_m2`/);
  });

  it("locks the next exact action", () => {
    assert.match(doc, /C1B possède une prochaine action exacte/);
    assert.match(doc, /acquisition\/extraction du zoning primaire Rabat/);
  });
});
