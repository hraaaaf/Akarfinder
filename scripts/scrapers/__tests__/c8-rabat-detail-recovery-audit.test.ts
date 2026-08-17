import assert from "node:assert/strict";
import test from "node:test";

import {
  C8_RABAT_DETAIL_AUDIT_SOURCE,
  C8_RABAT_DETAIL_SOURCE_SCAN_CAP,
  c8DetailAuditDedupKey,
  extractStrictAgenzTitleSurface,
  extractStrictDetailSurface,
  inferC8DetailIntent,
  matchesC8CandidateLocality,
  selectC8DetailAuditCandidates,
} from "../c8-rabat-detail-recovery-audit";
import { extractStrictDetailPrice } from "../price-detail-enrichment-v2";

test("C8 detail audit keeps a deliberate bounded source scan", () => {
  assert.equal(C8_RABAT_DETAIL_SOURCE_SCAN_CAP, 1000);
});

test("C8 detail audit infers sale/rent intent without mutating data", () => {
  assert.equal(inferC8DetailIntent({ normalized_intent: "sale", canonical_url: "https://agenz.ma/x/1" }), "sale");
  assert.equal(inferC8DetailIntent({ normalized_intent: null, canonical_url: "https://agenz.ma/fr/annonces/location/1" }), "rent");
  assert.equal(inferC8DetailIntent({ normalized_intent: null, canonical_url: "https://agenz.ma/fr/annonces/inconnu/1" }), null);
});

test("C8 detail audit resolves only candidate localities from source-record text", () => {
  assert.equal(
    matchesC8CandidateLocality({ title: "Appartement à Youssoufia Rabat", snippet: null, search_text: null }, "youssoufia"),
    true,
  );
  assert.equal(
    matchesC8CandidateLocality({ title: "Appartement Agdal Rabat", snippet: null, search_text: null }, "youssoufia"),
    false,
  );
});

test("C8 detail audit accepts high-confidence JSON-LD or page-scoped title surface evidence", () => {
  const jsonLd = `<html><body><script type="application/ld+json">${JSON.stringify({
    "@type": "Apartment",
    name: "Appartement",
    floorSize: { "@type": "QuantitativeValue", value: 120 },
  })}</script></body></html>`;
  assert.equal(extractStrictDetailSurface(jsonLd), 120);

  const agenzTitle = '<html><head><meta property="og:title" content="Appartement à vendre 3 200 000 dh 130 m², 3 chambres - Diour Jamaa Rabat"><title>Appartement à vendre 3 200 000 dh 130 m², 3 chambres - Diour Jamaa Rabat</title></head><body></body></html>';
  assert.equal(extractStrictAgenzTitleSurface(agenzTitle), 130);
  assert.equal(extractStrictDetailSurface(agenzTitle), 130);

  assert.equal(extractStrictDetailSurface('<html><body><p>Surface totale 120 m²</p></body></html>'), null);
  assert.equal(extractStrictDetailSurface('<html><head><title>Appartement 80 m² ou 120 m²</title></head></html>'), null);
  assert.equal(extractStrictDetailSurface('<html><head><title>Terrain 2 ha</title></head></html>'), null);
  assert.equal(extractStrictDetailSurface('<html><head><title>Appartement 5 m²</title></head></html>'), null);
});

test("C8 detail audit refuses conflicting page-scoped title surfaces", () => {
  const html = '<html><head><meta property="og:title" content="Appartement 130 m²"><title>Appartement 259 m²</title></head></html>';
  assert.equal(extractStrictAgenzTitleSurface(html), null);
});

test("C8 detail audit reuses strict price extraction", () => {
  const html = `<html><head><title>Appartement 1 500 000 MAD</title></head><body></body></html>`;
  assert.equal(extractStrictDetailPrice(html, "sale"), 1_500_000);
  assert.equal(extractStrictDetailPrice('<html><head><title>Appartement 9 000 MAD/m2</title></head></html>', "sale"), null);
});

test("C8 detail audit deduplicates Agenz FR/EN URLs by final listing id", () => {
  assert.equal(
    c8DetailAuditDedupKey({
      seed_id: "fr",
      source_domain: C8_RABAT_DETAIL_AUDIT_SOURCE,
      canonical_url: "https://agenz.ma/fr/annonces/immo-rabat/location-appartements/diour-jamaa/343737",
    }),
    "agenz.ma:343737",
  );
  assert.equal(
    c8DetailAuditDedupKey({
      seed_id: "en",
      source_domain: C8_RABAT_DETAIL_AUDIT_SOURCE,
      canonical_url: "https://agenz.ma/en/annonces/immo-rabat/location-appartements/diour-jamaa/343737",
    }),
    "agenz.ma:343737",
  );
});

test("C8 detail audit keeps only Agenz recognized detail URLs, target locality and missing fields", () => {
  const rows = [
    {
      seed_id: "a",
      canonical_url: "https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/youssoufia/123456",
      source_domain: C8_RABAT_DETAIL_AUDIT_SOURCE,
      normalized_intent: "sale",
      normalized_price_mad: null,
      normalized_surface_m2: null,
      title: "Appartement à Youssoufia Rabat",
      snippet: null,
      search_text: null,
      updated_at: "2026-08-16T00:00:00Z",
    },
    {
      seed_id: "a-en",
      canonical_url: "https://agenz.ma/en/annonces/immo-rabat/vente-appartements/youssoufia/123456",
      source_domain: C8_RABAT_DETAIL_AUDIT_SOURCE,
      normalized_intent: "sale",
      normalized_price_mad: null,
      normalized_surface_m2: null,
      title: "Apartment Youssoufia Rabat",
      snippet: null,
      search_text: "Youssoufia Rabat",
      updated_at: "2026-08-15T00:00:00Z",
    },
    {
      seed_id: "b",
      canonical_url: "https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/youssoufia",
      source_domain: C8_RABAT_DETAIL_AUDIT_SOURCE,
      normalized_intent: "sale",
      normalized_price_mad: null,
      normalized_surface_m2: null,
      title: "Appartement à Youssoufia Rabat",
      snippet: null,
      search_text: null,
      updated_at: "2026-08-16T00:00:00Z",
    },
    {
      seed_id: "c",
      canonical_url: "https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/youssoufia/999999",
      source_domain: C8_RABAT_DETAIL_AUDIT_SOURCE,
      normalized_intent: "sale",
      normalized_price_mad: 1_000_000,
      normalized_surface_m2: 90,
      title: "Appartement à Youssoufia Rabat",
      snippet: null,
      search_text: null,
      updated_at: "2026-08-16T00:00:00Z",
    },
  ];

  const selected = selectC8DetailAuditCandidates(rows, "youssoufia", 10);
  assert.deepEqual(selected.map((row) => row.seed_id), ["a"]);
});
