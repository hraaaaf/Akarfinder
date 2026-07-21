// AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 #7/10 -- Source Discovery Atlas.
// Registers 2 new class-A domains found via organic surfacing in
// discovery_candidates (745 distinct domains observed; these 2 had the
// clearest, most defensible individual-listing URL pattern proof against
// REAL positive and negative examples pulled from live discovery_candidates
// rows -- no fabricated URLs). This test file proves the same properties as
// the earlier registry-addition missions: registry load, exact pattern
// match on real positive/negative examples, genuine registry-driven
// classification (not a hardcode), coverage_cities, and no over-admission.

import test from "node:test";
import assert from "node:assert/strict";
import {
  getListingUrlPatterns,
  getDomainEntry,
  getDomainStatus,
  isDomainAdmissible,
  loadSourceDomainRegistry,
} from "../../../lib/openserp-ingestion/domain-registry.js";
import { classifyOpenSerpResult } from "../../../lib/openserp-ingestion/classify.js";
import type { OpenSerpIngestionQuery } from "../../../lib/openserp-ingestion/types.js";

const registry = loadSourceDomainRegistry();

function pathMatches(domain: string, url: string): boolean {
  const pathname = new URL(url).pathname;
  return getListingUrlPatterns(domain, registry).some((p) => p.test(pathname));
}

test("registry loads both new domains with status=approved_discovery", () => {
  for (const domain of ["aykana.ma", "promoimmomarrakech.com"]) {
    const entry = getDomainEntry(domain, registry);
    assert.ok(entry, `${domain} must be present in the registry`);
    assert.equal(entry?.status, "approved_discovery");
    assert.equal(getDomainStatus(domain, registry), "approved_discovery");
    assert.equal(isDomainAdmissible(domain, registry), true);
  }
});

// ---------------------------------------------------------------------
// aykana.ma -- real examples pulled from live discovery_candidates rows
// ---------------------------------------------------------------------

test("aykana.ma: 3 real positive examples match, including one with no trailing numeric ref", () => {
  assert.ok(pathMatches("aykana.ma", "https://aykana.ma/property/vente-bureau-en-exclusivite-rabat-hay-riad-ref-3966"));
  assert.ok(pathMatches("aykana.ma", "https://aykana.ma/property/location-local-commercial-dexception-rabat-aviation-ref-4058"));
  assert.ok(pathMatches("aykana.ma", "https://aykana.ma/property/location-bureau-rabat-locean-ref"), "no trailing number is still a real individual listing -- pattern must not require one");
});

test("aykana.ma: /property-type/ (category page) does NOT match -- word-boundary discipline, not mere absence from the sample", () => {
  assert.equal(pathMatches("aykana.ma", "https://aykana.ma/property-type/local-commercial-2"), false);
});

test("aykana.ma: guide/blog page (no /property/ prefix at all) does NOT match", () => {
  assert.equal(
    pathMatches("aykana.ma", "https://aykana.ma/location-et-achat-de-bureaux-a-rabat-tarifs-2025-et-meilleurs-emplacements-agdal-hay-riad"),
    false,
  );
});

test("aykana.ma: bare homepage does not match", () => {
  assert.equal(pathMatches("aykana.ma", "https://aykana.ma/"), false);
});

// ---------------------------------------------------------------------
// promoimmomarrakech.com -- real examples pulled from live discovery_candidates rows
// ---------------------------------------------------------------------

test("promoimmomarrakech.com: 3 real positive examples match", () => {
  assert.ok(pathMatches("promoimmomarrakech.com", "https://promoimmomarrakech.com/produit/vlc-296/villa-location-sjour-marrakech-route-fes.html"));
  assert.ok(pathMatches("promoimmomarrakech.com", "https://promoimmomarrakech.com/produit/avm-64/appartement-vente-marrakech-hivernage.html"));
  assert.ok(pathMatches("promoimmomarrakech.com", "https://promoimmomarrakech.com/produit/bv-65-2/bureau-vente-marrakech-gueliz.html"));
});

test("promoimmomarrakech.com: top-level category pages (no /produit/ prefix) do NOT match", () => {
  assert.equal(pathMatches("promoimmomarrakech.com", "https://promoimmomarrakech.com/vente-terrain-gueliz-marrakech.html"), false);
  assert.equal(pathMatches("promoimmomarrakech.com", "https://promoimmomarrakech.com/location/ferme/marrakech"), false);
});

test("promoimmomarrakech.com: bare homepage does not match", () => {
  assert.equal(pathMatches("promoimmomarrakech.com", "https://promoimmomarrakech.com/"), false);
});

// ---------------------------------------------------------------------
// End-to-end: classifyOpenSerpResult genuinely uses the registry
// ---------------------------------------------------------------------

const baseQuery: OpenSerpIngestionQuery = {
  query_id: "q-atlas7-1",
  city: "Rabat",
  district: null as unknown as string,
  transaction_type: "sale",
  property_type: "office",
  query_text: "bureau a vendre Rabat",
  priority: "high",
};

function resultFor(domain: string, url: string) {
  return classifyOpenSerpResult({
    query: baseQuery,
    engine: "bing" as const,
    discovered_at: "2026-07-21T12:00:00.000Z",
    fallbackRank: 1,
    result: { id: "atlas7", domain, title: "Bureau a vendre", snippet: "Bel bureau", url },
  });
}

test("classifyOpenSerpResult recognizes aykana.ma's /property/ path via the real registry (end-to-end)", () => {
  const actual = resultFor("aykana.ma", "https://aykana.ma/property/vente-bureau-en-exclusivite-rabat-hay-riad-ref-3966");
  assert.ok(actual);
  assert.equal(actual.source_domain, "aykana.ma");
  assert.ok(actual.classification_reasons.includes("strong_individual_path"));
});

test("classifyOpenSerpResult recognizes promoimmomarrakech.com's /produit/ path via the real registry (end-to-end)", () => {
  const actual = resultFor("promoimmomarrakech.com", "https://promoimmomarrakech.com/produit/avm-64/appartement-vente-marrakech-hivernage.html");
  assert.ok(actual);
  assert.ok(actual.classification_reasons.includes("strong_individual_path"));
});

// ---------------------------------------------------------------------
// coverage_cities matches the real evidence
// ---------------------------------------------------------------------

test("coverage_cities matches the observed evidence: aykana.ma=Rabat, promoimmomarrakech.com=Marrakech", () => {
  assert.deepEqual(getDomainEntry("aykana.ma", registry)?.coverage_cities, ["Rabat"]);
  assert.deepEqual(getDomainEntry("promoimmomarrakech.com", registry)?.coverage_cities, ["Marrakech"]);
});

// ---------------------------------------------------------------------
// No over-admission: the reviewed-but-not-registered B/C candidates from
// this same Atlas pass remain unclassified/unregistered
// ---------------------------------------------------------------------

test("reviewed B/C candidates from the same Atlas pass remain unregistered (documented, not activated)", () => {
  for (const domain of [
    "domio.ma", "immobilier.cari.ma", "sekna.ma", "immoessaouira.com",
    "dardar.ma", "flink.ma", "fadlimmo.com", "bakimmo.com",
    "portail-immobilier.ma", "archimmomaroc.com", "proimmobilier.ma",
    "maisonessaouira.com", "essaouira.immo", "capalmrabat.com", "nador.immo",
    "fazwaz.fr", "kaynly.com", "rahalatmorocco.com",
    "marocmarrakech.com", "riads-maroc.com", "riadaumaroc.com",
  ]) {
    assert.equal(getDomainStatus(domain, registry), "unclassified", `${domain} must remain unregistered this mission`);
  }
});

test("the 21 pre-existing domains' patterns are unchanged by this mission (spot check)", () => {
  assert.ok(pathMatches("mubawab.ma", "https://mubawab.ma/fr/is/appartement-123"));
  assert.ok(pathMatches("atlasimmobilier.com", "https://atlasimmobilier.com/p/5942/"));
  assert.equal(pathMatches("mubawab.ma", "https://mubawab.ma/fr/vente/rabat"), false);
});
