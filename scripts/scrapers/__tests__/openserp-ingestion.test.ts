import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalizeSourceUrl,
  extractCity,
  extractDistrict,
  parsePriceMad,
  parseSurfaceM2,
  redactSensitiveText,
  scoreCompleteness,
} from "../../../lib/openserp-ingestion/utils.js";
import { classifyOpenSerpResult } from "../../../lib/openserp-ingestion/classify.js";
import type { OpenSerpIngestionQuery } from "../../../lib/openserp-ingestion/types.js";

const baseQuery: OpenSerpIngestionQuery = {
  query_id: "q-1",
  city: "Casablanca",
  district: "Maarif",
  transaction_type: "sale",
  property_type: "apartment",
  query_text: "appartement a vendre Casablanca Maarif",
  priority: "high",
};

test("canonicalizeSourceUrl removes tracking params and fragments", () => {
  const actual = canonicalizeSourceUrl(
    "http://www.example.com/listing?id=123&utm_source=ads&fbclid=abc#section",
  );
  assert.equal(actual, "https://example.com/listing?id=123");
});

test("redactSensitiveText removes phone, whatsapp and emails", () => {
  const actual = redactSensitiveText("Contact WhatsApp +212612345678 ou test@example.com");
  assert.equal(actual.value, "Contact ou");
  assert.equal(actual.phone_hits, 1);
  assert.equal(actual.whatsapp_hits, 1);
  assert.equal(actual.personal_email_hits, 1);
});

test("classifyOpenSerpResult accepts strong individual listing signals", () => {
  const actual = classifyOpenSerpResult({
    query: baseQuery,
    engine: "bing",
    discovered_at: "2026-07-13T11:00:00.000Z",
    fallbackRank: 1,
    result: {
      id: "r1",
      title: "Appartement a vendre Maarif 1 450 000 DH",
      snippet: "Appartement de 96 m2 avec 2 chambres a Casablanca Maarif",
      url: "https://example.com/listings/appartement-a-vendre-123",
      domain: "example.com",
    },
  });

  assert.ok(actual);
  assert.equal(actual.classification_lane, "individual_listing");
  assert.equal(actual.extracted.city, "Casablanca");
  assert.equal(actual.extracted.district, "Maarif");
  assert.equal(actual.extracted.price_mad, 1450000);
  assert.equal(actual.extracted.surface_m2, 96);
});

test("classifyOpenSerpResult rejects obvious category pages", () => {
  const actual = classifyOpenSerpResult({
    query: baseQuery,
    engine: "bing",
    discovered_at: "2026-07-13T11:00:00.000Z",
    fallbackRank: 1,
    result: {
      id: "r2",
      title: "Appartements a vendre a Maarif Casablanca",
      snippet: "Parcourez 769 annonces immobilieres et comparez les prix",
      url: "https://example.com/vente/appartements-casablanca-maarif",
      domain: "example.com",
    },
  });

  assert.ok(actual);
  assert.notEqual(actual.classification_lane, "individual_listing");
});

test("classifyOpenSerpResult accepts strong Sarouty detail URLs", () => {
  const actual = classifyOpenSerpResult({
    query: {
      ...baseQuery,
      property_type: "villa",
      query_text: "villa a vendre Casablanca Sidi Maarouf",
      district: "Sidi Maarouf",
    },
    engine: "duckduckgo",
    discovered_at: "2026-07-13T11:00:00.000Z",
    fallbackRank: 1,
    result: {
      id: "r3",
      title: "Villa À Vendre Sidi Maarouf Casablanca | Sarouty",
      snippet: "villa à vendre située à Sidi Marouf, bien ensoleillée sur trois niveaux",
      url: "https://www.sarouty.ma/acheter/villa-casablanca-sidi-maarouf-865790",
      domain: "sarouty.ma",
    },
  });

  assert.ok(actual);
  assert.equal(actual.classification_lane, "individual_listing");
});

test("classifyOpenSerpResult rejects Avito search hubs", () => {
  const actual = classifyOpenSerpResult({
    query: baseQuery,
    engine: "bing",
    discovered_at: "2026-07-13T11:00:00.000Z",
    fallbackRank: 1,
    result: {
      id: "r4",
      title: "appartement a vendre maarif casablanca - Avito.ma",
      snippet: "Découvrez 8372 offres pour appartement a vendre maarif casablanca",
      url: "https://www.avito.ma/sp/immobilier/appartement-a-vendre-maarif-casablanca",
      domain: "avito.ma",
    },
  });

  assert.ok(actual);
  assert.notEqual(actual.classification_lane, "individual_listing");
});

// OPENSERP-CLASSIFY-OUT-OF-SCOPE-TOKEN-BOUNDARY-FIX-1
test("classifyOpenSerpResult rejects genuine furniture content via out_of_scope_token (mobilier as its own word)", () => {
  const actual = classifyOpenSerpResult({
    query: baseQuery,
    engine: "bing",
    discovered_at: "2026-07-20T11:00:00.000Z",
    fallbackRank: 1,
    result: {
      id: "r5",
      title: "Mobilier de bureau a Casablanca",
      snippet: "Grand choix de meubles et mobilier de bureau pour professionnels",
      url: "https://example.com/mobilier-bureau-casablanca",
      domain: "example.com",
    },
  });

  assert.ok(actual);
  assert.equal(actual.classification_lane, "reject_out_of_scope");
  assert.ok(actual.classification_reasons.includes("out_of_scope_token"));
});

test("classifyOpenSerpResult never rejects 'immobilier' (real estate) via the mobilier token", () => {
  const actual = classifyOpenSerpResult({
    query: baseQuery,
    engine: "bing",
    discovered_at: "2026-07-20T11:00:00.000Z",
    fallbackRank: 1,
    result: {
      id: "r6",
      title: "Agence immobilier Casablanca Maarif",
      snippet: "Appartement a vendre 1 200 000 DH, 85 m2, 3 chambres",
      url: "https://example.com/immobilier/appartement-a-vendre-456",
      domain: "example.com",
    },
  });

  assert.ok(actual);
  assert.ok(!actual.classification_reasons.includes("out_of_scope_token"));
});

test("classifyOpenSerpResult never rejects 'immobiliere' (accented) via the mobilier token", () => {
  const actual = classifyOpenSerpResult({
    query: baseQuery,
    engine: "bing",
    discovered_at: "2026-07-20T11:00:00.000Z",
    fallbackRank: 1,
    result: {
      id: "r7",
      title: "Agence immobiliere Casablanca",
      snippet: "Appartement a vendre 1 200 000 DH, 85 m2, 3 chambres a Maarif",
      url: "https://example.com/immobiliere/appartement-a-vendre-789",
      domain: "example.com",
    },
  });

  assert.ok(actual);
  assert.ok(!actual.classification_reasons.includes("out_of_scope_token"));
});

test("classifyOpenSerpResult never rejects a domain name containing 'immobilier' via the mobilier token", () => {
  const actual = classifyOpenSerpResult({
    query: baseQuery,
    engine: "bing",
    discovered_at: "2026-07-20T11:00:00.000Z",
    fallbackRank: 1,
    result: {
      id: "r8",
      title: "Appartement a vendre Maarif Casablanca",
      snippet: "Appartement de 96 m2 avec 2 chambres a Casablanca Maarif, 1 450 000 DH",
      url: "https://kawtarimmobilier.com/vente/appartement-a-vendre-maarif-ref-123.html",
      domain: "kawtarimmobilier.com",
    },
  });

  assert.ok(actual);
  assert.ok(!actual.classification_reasons.includes("out_of_scope_token"));
});

test("parsePriceMad supports compact MDH notation", () => {
  assert.equal(parsePriceMad("Appartement 1,2 MDH a Casablanca"), 1200000);
});

test("parseSurfaceM2 supports m2 and m² variants", () => {
  assert.equal(parseSurfaceM2("Appartement de 80 m2 a vendre"), 80);
  assert.equal(parseSurfaceM2("Studio de 54 m² bien situe"), 54);
});

test("extractCity and extractDistrict normalize accented districts", () => {
  assert.equal(extractCity("Location studio Guéliz Marrakech"), "Marrakech");
  assert.deepEqual(extractDistrict("Appartement à louer Aïn Diab Casablanca"), {
    city: "Casablanca",
    district: "Ain Diab",
  });
});

test("scoreCompleteness rewards richer candidates", () => {
  const weak = scoreCompleteness({
    title: "Appartement",
    city: "Casablanca",
    district: null,
    transaction_type: "sale",
    property_type: "apartment",
    price_mad: null,
    surface_m2: null,
    bedrooms_count: null,
    short_description: null,
  });
  const strong = scoreCompleteness({
    title: "Appartement a vendre",
    city: "Casablanca",
    district: "Maarif",
    transaction_type: "sale",
    property_type: "apartment",
    price_mad: 1450000,
    surface_m2: 96,
    bedrooms_count: 2,
    short_description: "Appartement moderne",
  });

  assert.ok(strong > weak);
});
