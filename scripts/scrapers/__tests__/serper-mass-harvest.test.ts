import assert from "node:assert/strict";
import test from "node:test";
import {
  ADAPTIVE_QUERY_BUDGET,
  DISCOVERY_QUERY_BUDGET,
  FIXED_QUERY_BUDGET,
  HARVEST_HARD_CAP,
  REFRESH_QUERY_BUDGET,
  buildAdaptiveQueries,
  buildDiscoveryHarvestQueries,
  buildFixedHarvestQueries,
  selectRefreshQueries,
} from "@/lib/serper-mass-harvest/planner";
import {
  canonicalizeHarvestUrl,
  classifyHarvestResult,
  normalizeHarvestResults,
} from "@/lib/serper-mass-harvest/core";
import type { HarvestQuery, HarvestQueryMetrics } from "@/lib/serper-mass-harvest/types";

test("Serper mass-harvest budget partitions sum to exactly 2000", () => {
  assert.equal(
    FIXED_QUERY_BUDGET + ADAPTIVE_QUERY_BUDGET + DISCOVERY_QUERY_BUDGET + REFRESH_QUERY_BUDGET,
    HARVEST_HARD_CAP,
  );
  assert.equal(HARVEST_HARD_CAP, 2000);
});

test("fixed planner emits exactly 900 deterministic source-targeted queries", () => {
  const first = buildFixedHarvestQueries();
  const second = buildFixedHarvestQueries();
  assert.equal(first.length, 900);
  assert.deepEqual(first, second);
  assert.equal(new Set(first.map((query) => query.id)).size, 900);
  assert.equal(new Set(first.map((query) => query.query)).size, 900);
  assert.equal(first.filter((query) => query.source_id === "mubawab").length, 160);
  assert.equal(first.filter((query) => query.source_id === "avito").length, 140);
  assert.equal(first.filter((query) => query.source_id === "sarouty").length, 120);
});

test("discovery planner emits exactly 250 long-tail queries excluding major portals", () => {
  const queries = buildDiscoveryHarvestQueries();
  assert.equal(queries.length, 250);
  assert.equal(new Set(queries.map((query) => query.query)).size, 250);
  for (const query of queries) {
    assert.equal(query.source_id, "long_tail");
    assert.match(query.query, /-site:avito\.ma/);
    assert.match(query.query, /-site:mubawab\.ma/);
    assert.match(query.query, /-site:sarouty\.ma/);
    assert.match(query.query, /-site:agenz\.ma/);
  }
});

test("canonicalizer strips tracking while preserving identity-bearing query params", () => {
  assert.equal(
    canonicalizeHarvestUrl("HTTPS://WWW.Example.ma/property/123/?utm_source=x&ref=foo&page=2#gallery"),
    "https://example.ma/property/123?page=2&ref=foo",
  );
});

test("real-estate query text alone cannot make an unrelated result eligible", () => {
  const query: HarvestQuery = {
    id: "q-noise",
    phase: "fixed",
    source_id: "mubawab",
    query: "site:mubawab.ma appartement Casablanca a vendre",
  };
  const result = classifyHarvestResult({
    query,
    canonicalUrl: "https://example.ma/article/12345",
    title: "Actualités automobiles",
    snippet: "Guide des voitures d'occasion",
  });
  assert.equal(result.status, "rejected");
});

test("Mubawab registered detail path is accepted only with real-estate signal", () => {
  const query: HarvestQuery = {
    id: "q1",
    phase: "fixed",
    source_id: "mubawab",
    query: "site:mubawab.ma/fr/a/ appartement Casablanca a vendre",
    city: "Casablanca",
    property_type: "appartement",
    intent: "sale",
  };
  const result = classifyHarvestResult({
    query,
    canonicalUrl: "https://mubawab.ma/fr/a/8099160/bel-appartement-casablanca",
    title: "Appartement à vendre à Casablanca",
    snippet: "Appartement 120 m² à vendre",
  });
  assert.equal(result.status, "accepted");
  assert.ok(result.reasons.includes("registry_individual_listing_pattern"));
});

test("Avito detail-looking non-real-estate URL is rejected by real-estate category gate", () => {
  const query: HarvestQuery = {
    id: "q2",
    phase: "fixed",
    source_id: "avito",
    query: "site:avito.ma/fr immobilier Casablanca",
    city: "Casablanca",
    property_type: "appartement",
    intent: "sale",
  };
  const result = classifyHarvestResult({
    query,
    canonicalUrl: "https://avito.ma/fr/casablanca/voitures_d_occasion/voiture_123456.htm",
    title: "Voiture occasion Casablanca",
    snippet: "Automobile à vendre",
  });
  assert.equal(result.status, "rejected");
});

test("new-source individual-like URL remains unclassified rather than auto-promoted", () => {
  const query: HarvestQuery = {
    id: "q3",
    phase: "discovery",
    source_id: "long_tail",
    query: "\"appartement a vendre\" Fes immobilier",
    city: "Fes",
    property_type: "appartement",
    intent: "sale",
  };
  const result = classifyHarvestResult({
    query,
    canonicalUrl: "https://new-agency.ma/property/appartement-fes-12345",
    title: "Appartement à vendre à Fès",
    snippet: "90 m², 2 chambres",
  });
  assert.equal(result.status, "unclassified");
  assert.ok(result.reasons.includes("individual_like_url_unreviewed_source"));
});

test("blocked registry domains remain rejected even when result looks real-estate", () => {
  const query: HarvestQuery = {
    id: "q4",
    phase: "discovery",
    source_id: "long_tail",
    query: "appartement Casablanca",
  };
  const result = classifyHarvestResult({
    query,
    canonicalUrl: "https://immobilier.trovit.ma/listing/123456",
    title: "Appartement Casablanca à vendre",
    snippet: "Immobilier Maroc",
  });
  assert.equal(result.status, "rejected");
  assert.ok(result.reasons.includes("registry_blocked"));
});

test("normalizer deduplicates canonical URLs inside one provider response", () => {
  const query: HarvestQuery = {
    id: "q5",
    phase: "fixed",
    source_id: "mubawab",
    query: "site:mubawab.ma/fr/a/ appartement Rabat a vendre",
  };
  const observations = normalizeHarvestResults(query, [
    {
      title: "Appartement Rabat",
      link: "https://mubawab.ma/fr/a/12345/appartement-rabat?utm_source=google",
      snippet: "Appartement à vendre",
      position: 1,
    },
    {
      title: "Appartement Rabat duplicate",
      link: "https://www.mubawab.ma/fr/a/12345/appartement-rabat",
      snippet: "Appartement à vendre",
      position: 2,
    },
  ]);
  assert.equal(observations.length, 1);
});

test("adaptive planner expands strong-yield queries and stops noisy queries", () => {
  const query: HarvestQuery = {
    id: "parent",
    phase: "fixed",
    source_id: "mubawab",
    query: "site:mubawab.ma/fr/a/ appartement Rabat a vendre",
    city: "Rabat",
    property_type: "appartement",
    intent: "sale",
  };
  const strong: HarvestQueryMetrics = {
    query,
    raw_results: 10,
    unique_results: 10,
    detail_candidates: 7,
    accepted_results: 6,
    rejected_results: 1,
    unclassified_results: 3,
    duplicate_results: 1,
    category_or_noise_results: 1,
    new_unique_results: 7,
    yield_ratio: 0.6,
  };
  assert.equal(buildAdaptiveQueries(strong, new Set()).length, 4);

  const noisy = { ...strong, accepted_results: 1, category_or_noise_results: 8 };
  assert.equal(buildAdaptiveQueries(noisy, new Set()).length, 0);
});

test("refresh selector caps replay at 150 and prioritizes accepted/new yield", () => {
  const metrics: HarvestQueryMetrics[] = Array.from({ length: 200 }, (_, index) => ({
    query: {
      id: `q-${index}`,
      phase: "fixed" as const,
      source_id: "mubawab" as const,
      query: `site:mubawab.ma/fr/a/ appartement city-${index}`,
    },
    raw_results: 10,
    unique_results: 10,
    detail_candidates: index % 10,
    accepted_results: index % 10,
    rejected_results: 0,
    unclassified_results: 10 - (index % 10),
    duplicate_results: 0,
    category_or_noise_results: 0,
    new_unique_results: index,
    yield_ratio: (index % 10) / 10,
  }));
  const refresh = selectRefreshQueries(metrics);
  assert.equal(refresh.length, 150);
  assert.ok(refresh.every((query) => query.phase === "refresh"));
});
