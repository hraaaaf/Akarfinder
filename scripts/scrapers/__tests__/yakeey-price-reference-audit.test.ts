import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";
import {
  YAKEEY_PRICE_REFERENCE_POLICY,
  extractYakeeyCityReferenceRows,
  extractYakeeyDistrictReferenceRows,
  extractYakeeyReferenceRows,
  parseYakeeyPriceCell,
} from "../../../lib/market/yakeey-price-reference.js";

function fixtureUrl(name: string): string {
  return fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
}

function loadFixture(name: string): string {
  return readFileSync(fixtureUrl(name), "utf8");
}

describe("Yakeey price reference policy", () => {
  test("source_type is benchmark_source", () => {
    assert.equal(YAKEEY_PRICE_REFERENCE_POLICY.source_type, "benchmark_source");
  });

  test("not_listing_source is true", () => {
    assert.equal(YAKEEY_PRICE_REFERENCE_POLICY.not_listing_source, true);
  });

  test("benchmark benchmark capabilities are enabled", () => {
    assert.equal(YAKEEY_PRICE_REFERENCE_POLICY.can_create_listing, false);
    assert.equal(YAKEEY_PRICE_REFERENCE_POLICY.can_compute_market_benchmark, true);
    assert.equal(YAKEEY_PRICE_REFERENCE_POLICY.can_compute_price_gap, true);
    assert.equal(YAKEEY_PRICE_REFERENCE_POLICY.attribution_required, true);
  });
});

describe("Yakeey price cell parsing", () => {
  test("parses apartment price", () => {
    assert.equal(parseYakeeyPriceCell("7 054 DH"), 7054);
  });

  test("parses villa price", () => {
    assert.equal(parseYakeeyPriceCell("13 879 DH"), 13879);
  });

  test("treats -- as missing", () => {
    assert.equal(parseYakeeyPriceCell("--"), null);
  });

  test("treats - as missing", () => {
    assert.equal(parseYakeeyPriceCell("-"), null);
  });
});

describe("Yakeey root page extraction", () => {
  const html = loadFixture("yakeey-root.html");
  const rows = extractYakeeyReferenceRows(
    html,
    "https://yakeey.com/fr-ma/referentiel-de-prix-immobilier"
  );

  test("extracts city rows", () => {
    assert.equal(rows.length, 5);
    assert.equal(rows[0].name, "Casablanca");
    assert.equal(rows[0].price_m2_appartement, 7054);
    assert.equal(rows[0].price_m2_villa, 13879);
  });

  test("preserves city urls", () => {
    assert.equal(rows[1].url, "https://yakeey.com/fr-ma/referentiel-de-prix-immobilier/rabat");
  });

  test("handles missing city prices", () => {
    const missing = rows.find((row) => row.name === "Ait Melloul");
    assert.ok(missing);
    assert.equal(missing?.status, "missing");
    assert.equal(missing?.price_m2_appartement, null);
    assert.equal(missing?.price_m2_villa, null);
  });
});

describe("Yakeey city page extraction", () => {
  const casablanca = extractYakeeyCityReferenceRows(
    loadFixture("yakeey-casablanca-city.html"),
    "https://yakeey.com/fr-ma/referentiel-de-prix-immobilier/casablanca"
  );

  const rabat = extractYakeeyDistrictReferenceRows(
    loadFixture("yakeey-rabat-city.html"),
    "https://yakeey.com/fr-ma/referentiel-de-prix-immobilier/rabat"
  );

  test("extracts quartiers", () => {
    assert.ok(casablanca.some((row) => row.name === "Maarif"));
    assert.ok(rabat.some((row) => row.district === "Agdal"));
  });

  test("extracts apartment and villa prices", () => {
    const financeCity = casablanca.find((row) => row.name === "Casablanca Finance City");
    assert.equal(financeCity?.price_m2_appartement, 19018);
    assert.equal(financeCity?.price_m2_villa, 8135);
  });

  test("extracts quartier urls when available", () => {
    const quartier = casablanca.find((row) => row.name === "Quartier De Parc Et Place");
    assert.equal(
      quartier?.url,
      "https://yakeey.com/fr-ma/referentiel-de-prix-immobilier/casablanca/quartier-de-parc-et-place"
    );
  });

  test("marks missing villa values correctly", () => {
    const quartier = casablanca.find((row) => row.name === "Quartier De Parc Et Place");
    assert.equal(quartier?.price_m2_villa, null);
    assert.equal(quartier?.price_m2_villa_status, "missing");
  });

  test("marks fully missing rows correctly", () => {
    const quartier = casablanca.find((row) => row.name === "Les Casernes");
    assert.equal(quartier?.status, "missing");
  });

  test("district extraction carries city metadata", () => {
    const agdal = rabat.find((row) => row.district === "Agdal");
    assert.equal(agdal?.city, "Rabat");
    assert.equal(agdal?.city_url, "https://yakeey.com/fr-ma/referentiel-de-prix-immobilier/rabat");
    assert.equal(agdal?.district_url, "https://yakeey.com/fr-ma/referentiel-de-prix-immobilier/rabat/agdal");
  });
});

describe("Yakeey noise rejection", () => {
  const html = loadFixture("yakeey-noise.html");
  const rows = extractYakeeyReferenceRows(
    html,
    "https://yakeey.com/fr-ma/referentiel-de-prix-immobilier"
  );

  test("ignores contact, image and listing noise", () => {
    assert.equal(rows.length, 0);
  });
});
