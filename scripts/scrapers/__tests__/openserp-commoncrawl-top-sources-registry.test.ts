// OPENSERP-COMMONCRAWL-TOP-SOURCES-REGISTRY-INTEGRATION-1
// Registers 4 new source domains (soukimmobilier.com, daragadir.com,
// masaken.ma, atlasimmobilier.com) classed "A" by
// COMMONCRAWL-SOURCE-INTELLIGENCE-TOP11-AUDIT-1. This test file proves,
// for each: the registry loads the domain correctly, getListingUrlPatterns
// returns exactly the audited pattern, the mandatory positive/negative
// URL examples from the audit behave correctly, detectUrlSignals (via
// classifyOpenSerpResult) genuinely uses the registry (not a hardcode),
// coverage_cities matches the audit's geographic finding, and no domain
// is ever auto-admitted outside its own configured pattern.
//
// No DB access, no network access, no bulk seed of any kind -- pure
// registry + classification unit tests.

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

// ---------------------------------------------------------------------
// A. Registry loads each domain correctly
// ---------------------------------------------------------------------

test("registry loads all 4 new domains with status=approved_discovery", () => {
  for (const domain of ["soukimmobilier.com", "daragadir.com", "masaken.ma", "atlasimmobilier.com"]) {
    const entry = getDomainEntry(domain, registry);
    assert.ok(entry, `${domain} must be present in the registry`);
    assert.equal(entry?.status, "approved_discovery");
    assert.equal(getDomainStatus(domain, registry), "approved_discovery");
    assert.equal(isDomainAdmissible(domain, registry), true);
  }
});

// ---------------------------------------------------------------------
// B/C/D. getListingUrlPatterns returns the exact audited pattern;
// mandatory positive/negative examples from the audit
// ---------------------------------------------------------------------

test("soukimmobilier.com: getListingUrlPatterns returns exactly 1 pattern", () => {
  assert.equal(getListingUrlPatterns("soukimmobilier.com", registry).length, 1);
});

test("soukimmobilier.com: 3 mandatory positive examples match", () => {
  assert.ok(pathMatches("soukimmobilier.com", "https://soukimmobilier.com/fr/agadir/appartement/37786924"));
  assert.ok(pathMatches("soukimmobilier.com", "https://soukimmobilier.com/fr/rabat/appartement/57016583"));
  assert.ok(pathMatches("soukimmobilier.com", "https://soukimmobilier.com/ar/centre-ville/commerce/58201811"));
});

test("soukimmobilier.com: 2 mandatory negative examples do NOT match", () => {
  assert.equal(pathMatches("soukimmobilier.com", "https://soukimmobilier.com/fr/vente/rabat/hay-riad"), false);
  assert.equal(pathMatches("soukimmobilier.com", "https://soukimmobilier.com/fr/location/agadir/hay-mohammadi/appartement"), false);
});

test("daragadir.com: fiche individuelle positive example matches", () => {
  assert.ok(
    pathMatches(
      "daragadir.com",
      "https://daragadir.com/annonces/annonces-immobilieres/vente/appartements-a-vendre-a-agadir/agadir-charmant-duplex-a-vendre-1-325-000-dh.html",
    ),
  );
});

test("daragadir.com: category page (no final slug, no .html) does NOT match", () => {
  assert.equal(
    pathMatches("daragadir.com", "https://daragadir.com/annonces/annonces-immobilieres/vente/locaux-a-vendre-a-agadir"),
    false,
  );
});

test("daragadir.com: pattern has no numeric-ID requirement (structural only, deliberately)", () => {
  // Two DIFFERENT slugs with no ID at all both match -- proves this is a
  // structural pattern, not accidentally requiring an ID that isn't there.
  assert.ok(pathMatches("daragadir.com", "https://daragadir.com/annonces/annonces-immobilieres/location/villas-et-riads-a-louer-a-agadir/villa-avec-piscine-hay-mohammadi.html"));
});

test("masaken.ma: fiche individuelle positive example matches", () => {
  assert.ok(pathMatches("masaken.ma", "https://masaken.ma/fr/immobilier-maroc/rabat/12345"));
  assert.ok(pathMatches("masaken.ma", "https://masaken.ma/en/immobilier-maroc/agadir/6789"));
});

test("masaken.ma: Arabic price-filter URL (looks like an ID but isn't) does NOT match", () => {
  assert.equal(
    pathMatches("masaken.ma", "https://masaken.ma/ar/immobilier-maroc/%D8%A7%D9%84%D8%B3%D8%B9%D8%B1/300000"),
    false,
  );
});

test("masaken.ma: pattern does not generalize beyond /fr|en/immobilier-maroc/", () => {
  assert.equal(pathMatches("masaken.ma", "https://masaken.ma/fr/actualites/marche-immobilier-2026"), false);
});

test("atlasimmobilier.com: /p/ positive examples match", () => {
  assert.ok(pathMatches("atlasimmobilier.com", "https://atlasimmobilier.com/p/5942/"));
  assert.ok(pathMatches("atlasimmobilier.com", "https://atlasimmobilier.com/en/p/260921/"));
});

test("atlasimmobilier.com: /li/, /q/, /feature/ negative examples do NOT match", () => {
  assert.equal(pathMatches("atlasimmobilier.com", "https://atlasimmobilier.com/li/terrains-a-vendre-a-essaouira"), false);
  assert.equal(pathMatches("atlasimmobilier.com", "https://atlasimmobilier.com/q/hivernage"), false);
  assert.equal(pathMatches("atlasimmobilier.com", "https://atlasimmobilier.com/en/feature/apartment-with-terrace-marrakech/"), false);
});

// ---------------------------------------------------------------------
// E/F. detectUrlSignals (via classifyOpenSerpResult) genuinely uses the
// registry, and correctly recognizes the domain end-to-end
// ---------------------------------------------------------------------

const baseQuery: OpenSerpIngestionQuery = {
  query_id: "q-ccts-1",
  city: "Rabat",
  district: null as unknown as string,
  transaction_type: "sale",
  property_type: "apartment",
  query_text: "appartement a vendre Rabat",
  priority: "high",
};

function resultFor(domain: string, url: string) {
  return classifyOpenSerpResult({
    query: baseQuery,
    engine: "bing" as const,
    discovered_at: "2026-07-20T12:00:00.000Z",
    fallbackRank: 1,
    result: { id: "ccts", domain, title: "Appartement a vendre", snippet: "Bel appartement", url },
  });
}

test("classifyOpenSerpResult recognizes soukimmobilier.com's individual path via the real registry (end-to-end)", () => {
  const actual = resultFor("soukimmobilier.com", "https://soukimmobilier.com/fr/rabat/appartement/57016583");
  assert.ok(actual);
  assert.equal(actual.source_domain, "soukimmobilier.com");
  assert.ok(actual.classification_reasons.includes("strong_individual_path"));
});

test("classifyOpenSerpResult recognizes atlasimmobilier.com's /p/ path via the real registry (end-to-end)", () => {
  const actual = resultFor("atlasimmobilier.com", "https://atlasimmobilier.com/p/5942/");
  assert.ok(actual);
  assert.ok(actual.classification_reasons.includes("strong_individual_path"));
});

// ---------------------------------------------------------------------
// G. coverage_cities matches the audit's geographic finding
// ---------------------------------------------------------------------

test("coverage_cities matches the audit finding for all 4 domains", () => {
  assert.equal(getDomainEntry("soukimmobilier.com", registry)?.coverage_cities ?? null, null, "national");
  assert.deepEqual(getDomainEntry("daragadir.com", registry)?.coverage_cities, ["Agadir"]);
  assert.equal(getDomainEntry("masaken.ma", registry)?.coverage_cities ?? null, null, "national");
  assert.deepEqual(getDomainEntry("atlasimmobilier.com", registry)?.coverage_cities, ["Marrakech", "Essaouira"]);
});

// ---------------------------------------------------------------------
// H. No auto-approval outside the configured pattern
// ---------------------------------------------------------------------

test("none of the 4 new domains admit a bare homepage/category path", () => {
  assert.equal(pathMatches("soukimmobilier.com", "https://soukimmobilier.com/"), false);
  assert.equal(pathMatches("daragadir.com", "https://daragadir.com/"), false);
  assert.equal(pathMatches("masaken.ma", "https://masaken.ma/"), false);
  assert.equal(pathMatches("atlasimmobilier.com", "https://atlasimmobilier.com/"), false);
});

test("a domain NOT in this mission's list of 4 (e.g. immo-maroc.com, a real B-class candidate from the same audit) is NOT admitted by this change", () => {
  assert.equal(getDomainStatus("immo-maroc.com", registry), "unclassified");
  assert.equal(isDomainAdmissible("immo-maroc.com", registry), false);
});

test("the other 7 non-A candidates from the same Common Crawl audit remain unregistered (out of scope for this mission)", () => {
  for (const domain of [
    "agadirimmobilier.org",
    "proimmobilier.ma",
    "2p.ma",
    "agence-immobiliere-essaouira.ma",
    "portail-immobilier.ma",
    "agence-immobiliere-agadir.ma",
  ]) {
    assert.equal(getDomainStatus(domain, registry), "unclassified", `${domain} must remain unregistered`);
  }
});

test("the 17 pre-existing domains' patterns are unchanged by this mission (spot check on a representative sample)", () => {
  assert.ok(pathMatches("mubawab.ma", "https://mubawab.ma/fr/is/appartement-123"));
  assert.ok(pathMatches("kawtarimmobilier.com", "https://kawtarimmobilier.com/essaouira/location/appartement/bel-appartement-a-louer-ref-2285.html"));
  assert.equal(pathMatches("mubawab.ma", "https://mubawab.ma/fr/vente/rabat"), false);
});
