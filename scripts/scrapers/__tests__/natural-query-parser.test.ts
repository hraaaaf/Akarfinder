import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseNaturalSearchQuery } from "../../../lib/search/natural-query-parser.js";

// GOOGLE-LIKE-SEARCH-QA-1 — Parser tests: 6 mission queries (A-F) + edge cases.

describe("parseNaturalSearchQuery — intent detection", () => {
  test("A. Appartement meublé louer Casablanca Maarif budget → intent=rent", () => {
    const r = parseNaturalSearchQuery("Appartement meublé à Casablanca Maarif moins de 8 000 DH");
    assert.equal(r.intent, "rent");
  });

  test("B. Villa à vendre Marrakech → intent=buy", () => {
    const r = parseNaturalSearchQuery("Villa Dar Bouazza avec piscine");
    assert.equal(r.intent, undefined); // no explicit intent keyword
  });

  test("C. Terrain titré Marrakech → no intent keyword", () => {
    const r = parseNaturalSearchQuery("Terrain titré Marrakech");
    assert.equal(r.intent, undefined);
  });

  test("D. Studio meublé Casablanca → intent=rent (furnished implies rent)", () => {
    const r = parseNaturalSearchQuery("Studio meublé Casablanca");
    assert.equal(r.intent, "rent");
  });

  test("E. Bureau à louer Finance City → intent=rent", () => {
    const r = parseNaturalSearchQuery("Bureau à louer Finance City");
    assert.equal(r.intent, "rent");
  });

  test("F. Appartement neuf Rabat Agdal → intent=new", () => {
    const r = parseNaturalSearchQuery("Appartement neuf Rabat Agdal");
    assert.equal(r.intent, "new");
  });
});

describe("parseNaturalSearchQuery — property_type detection", () => {
  test("appartement → Appartement", () => {
    const r = parseNaturalSearchQuery("Appartement meublé Casablanca");
    assert.equal(r.property_type, "Appartement");
  });

  test("villa → Villa", () => {
    const r = parseNaturalSearchQuery("Villa Dar Bouazza avec piscine");
    assert.equal(r.property_type, "Villa");
  });

  test("terrain → Terrain", () => {
    const r = parseNaturalSearchQuery("Terrain titré Marrakech");
    assert.equal(r.property_type, "Terrain");
  });

  test("studio → Studio", () => {
    const r = parseNaturalSearchQuery("Studio meublé Casablanca");
    assert.equal(r.property_type, "Studio");
  });

  test("bureau → Bureau", () => {
    const r = parseNaturalSearchQuery("Bureau à louer Finance City");
    assert.equal(r.property_type, "Bureau");
  });
});

describe("parseNaturalSearchQuery — city detection", () => {
  test("Casablanca detected", () => {
    const r = parseNaturalSearchQuery("Appartement meublé à Casablanca Maarif moins de 8 000 DH");
    assert.equal(r.city, "Casablanca");
  });

  test("casa alias → Casablanca", () => {
    const r = parseNaturalSearchQuery("Studio meublé Casa");
    assert.equal(r.city, "Casablanca");
  });

  test("Rabat detected", () => {
    const r = parseNaturalSearchQuery("Appartement neuf Rabat Agdal");
    assert.equal(r.city, "Rabat");
  });

  test("Marrakech detected", () => {
    const r = parseNaturalSearchQuery("Terrain titré Marrakech");
    assert.equal(r.city, "Marrakech");
  });

  test("no city in query → city=undefined", () => {
    const r = parseNaturalSearchQuery("Bureau à louer Finance City");
    assert.equal(r.city, undefined);
  });
});

describe("parseNaturalSearchQuery — district detection", () => {
  test("Maarif detected", () => {
    const r = parseNaturalSearchQuery("Appartement meublé à Casablanca Maarif moins de 8 000 DH");
    assert.equal(r.district, "Maarif");
  });

  test("Dar Bouazza (multi-word) detected", () => {
    const r = parseNaturalSearchQuery("Villa Dar Bouazza avec piscine");
    assert.equal(r.district, "Dar Bouazza");
  });

  test("Finance City (multi-word) detected", () => {
    const r = parseNaturalSearchQuery("Bureau à louer Finance City");
    assert.equal(r.district, "Finance City");
  });

  test("Agdal detected", () => {
    const r = parseNaturalSearchQuery("Appartement neuf Rabat Agdal");
    assert.equal(r.district, "Agdal");
  });
});

describe("parseNaturalSearchQuery — budget_max detection", () => {
  test("moins de 8 000 DH → 8000", () => {
    const r = parseNaturalSearchQuery("Appartement meublé à Casablanca Maarif moins de 8 000 DH");
    assert.equal(r.budget_max, 8000);
  });

  test("10000 DH (currency suffix) → 10000", () => {
    const r = parseNaturalSearchQuery("Studio Casablanca 10000 DH");
    assert.equal(r.budget_max, 10000);
  });

  test("max 5000 MAD → 5000", () => {
    const r = parseNaturalSearchQuery("Appartement louer Rabat max 5000 MAD");
    assert.equal(r.budget_max, 5000);
  });

  test("1200k → 1200000", () => {
    const r = parseNaturalSearchQuery("Villa Marrakech moins de 1200k");
    assert.equal(r.budget_max, 1200000);
  });

  test("no budget in query → budget_max=undefined", () => {
    const r = parseNaturalSearchQuery("Appartement neuf Rabat Agdal");
    assert.equal(r.budget_max, undefined);
  });

  test("small number (5 chambres) not treated as budget", () => {
    const r = parseNaturalSearchQuery("Villa 5 chambres Casablanca");
    assert.equal(r.budget_max, undefined);
  });
});

describe("parseNaturalSearchQuery — furnished detection", () => {
  test("meublé → furnished=true", () => {
    const r = parseNaturalSearchQuery("Appartement meublé Casablanca");
    assert.equal(r.furnished, true);
  });

  test("Studio meublé → furnished=true, intent=rent", () => {
    const r = parseNaturalSearchQuery("Studio meublé Casablanca");
    assert.equal(r.furnished, true);
    assert.equal(r.intent, "rent");
  });

  test("no meublé → furnished=undefined", () => {
    const r = parseNaturalSearchQuery("Villa Marrakech à vendre");
    assert.equal(r.furnished, undefined);
  });
});

describe("parseNaturalSearchQuery — q always preserved", () => {
  test("q = original input string", () => {
    const input = "Appartement meublé à Casablanca Maarif moins de 8 000 DH";
    const r = parseNaturalSearchQuery(input);
    assert.equal(r.q, input);
  });

  test("empty string → q = empty, no other fields", () => {
    const r = parseNaturalSearchQuery("  ");
    assert.equal(r.q, "");
    assert.equal(r.intent, undefined);
    assert.equal(r.city, undefined);
  });
});
