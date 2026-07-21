// OPENSERP-REGISTRY-PATTERN-SOURCE-OF-TRUTH-1
// Proves data/openserp/source-domain-registry.json's listing_url_patterns
// is now the single, functionally-enforced source of truth for "strong
// individual listing path" detection, replacing the parallel hardcoded
// copies that used to live in classify.ts's DOMAIN_RULES[domain].
// strongIndividual. Covers: real runtime usage, a fixture-pattern-change
// actually changing runtime behavior, fail-closed handling (invalid
// regex / unknown domain / known domain with no pattern), a positive/
// negative parity corpus for every domain whose pattern moved out of
// classify.ts entirely, and a static proof no strongIndividual hardcode
// remains in classify.ts.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  getListingUrlPatterns,
  loadSourceDomainRegistry,
  type SourceDomainRegistry,
} from "../../../lib/openserp-ingestion/domain-registry.js";
import { classifyOpenSerpResult } from "../../../lib/openserp-ingestion/classify.js";
import type { OpenSerpIngestionQuery } from "../../../lib/openserp-ingestion/types.js";

const baseQuery: OpenSerpIngestionQuery = {
  query_id: "q-registry-1",
  city: "Marrakech",
  district: "Hivernage",
  transaction_type: "sale",
  property_type: "apartment",
  query_text: "appartement a vendre Marrakech Hivernage",
  priority: "high",
};

function fixtureRegistry(entry: Partial<SourceDomainRegistry["domains"][number]> & { domain: string }): SourceDomainRegistry {
  return {
    registry_version: "test-fixture",
    generated_at: "2026-07-20T00:00:00Z",
    note: "test fixture, never read from disk",
    domains: [
      {
        status: "approved_discovery",
        listing_url_patterns: [],
        blocked_url_patterns: [],
        source_type: "agency_site",
        external_web_result: true,
        compliance_note: "fixture",
        reviewed_at: "2026-07-20",
        coverage_cities: null,
        ...entry,
      },
    ],
  };
}

// ---------------------------------------------------------------------
// 1. Registry pattern actually used at runtime (real on-disk registry)
// ---------------------------------------------------------------------

test("getListingUrlPatterns reads the REAL on-disk registry, not a fixture", () => {
  const real = loadSourceDomainRegistry();
  const patterns = getListingUrlPatterns("mubawab.ma", real);
  assert.ok(patterns.length >= 3, "mubawab.ma must have its 3 real registry patterns compiled");
  assert.ok(patterns[0].test("/fr/is/appartement-123"), "the real registry pattern must actually match a real mubawab.ma listing path");
});

test("case_insensitive registry entries compile with the /i flag from the REAL on-disk registry (1immo.ma, mouldar.com, kawtarimmobilier.com)", () => {
  const real = loadSourceDomainRegistry();
  const oneImmo = getListingUrlPatterns("1immo.ma", real);
  assert.ok(oneImmo.some((p) => p.flags.includes("i")), "1immo.ma's migrated pattern must carry the case_insensitive flag");
  const mouldar = getListingUrlPatterns("mouldar.com", real);
  assert.ok(mouldar.some((p) => p.flags.includes("i")), "mouldar.com's migrated pattern must carry the case_insensitive flag");
  const kawtar = getListingUrlPatterns("kawtarimmobilier.com", real);
  assert.ok(kawtar.some((p) => p.flags.includes("i")), "kawtarimmobilier.com's migrated pattern must carry the case_insensitive flag");
});

test("kawtarimmobilier.com's registry pattern now matches BOTH vente and location (the stale-registry divergence found and fixed by this mission)", () => {
  const real = loadSourceDomainRegistry();
  const patterns = getListingUrlPatterns("kawtarimmobilier.com", real);
  assert.ok(patterns.some((p) => p.test("/vente/appartement-a-vendre-essaouira-ref-123.html")));
  assert.ok(patterns.some((p) => p.test("/essaouira/location/appartement/bel-appartement-a-louer-ref-2285.html")));
});

// ---------------------------------------------------------------------
// 2. Modifying a fixture pattern actually changes runtime behavior
// ---------------------------------------------------------------------

test("changing a domain's listing_url_patterns in the JSON changes getListingUrlPatterns' output (proves genuine runtime dependency, not a cached hardcode)", () => {
  const before = fixtureRegistry({ domain: "test-runtime-proof.ma", listing_url_patterns: ["/old-pattern-\\d+$"] });
  const beforePatterns = getListingUrlPatterns("test-runtime-proof.ma", before);
  assert.equal(beforePatterns.length, 1);
  assert.ok(beforePatterns[0].test("/old-pattern-123"));
  assert.equal(beforePatterns[0].test("/new-pattern-123"), false);

  const after = fixtureRegistry({ domain: "test-runtime-proof.ma", listing_url_patterns: ["/new-pattern-\\d+$"] });
  const afterPatterns = getListingUrlPatterns("test-runtime-proof.ma", after);
  assert.equal(afterPatterns.length, 1);
  assert.equal(afterPatterns[0].test("/old-pattern-123"), false, "the OLD pattern must no longer match after the registry entry changed");
  assert.ok(afterPatterns[0].test("/new-pattern-123"), "the NEW pattern must match after the registry entry changed");
});

test("changing a pattern in a real temp JSON FILE on disk (not just an in-memory object) changes runtime behavior via loadSourceDomainRegistry(path)", () => {
  const tmpPath = join(tmpdir(), `registry-runtime-proof-${Date.now()}-${Math.random()}.json`);
  try {
    const v1 = fixtureRegistry({ domain: "test-file-proof.ma", listing_url_patterns: ["/v1-\\d+$"] });
    writeFileSync(tmpPath, JSON.stringify(v1), "utf8");
    const registryV1 = loadSourceDomainRegistry(tmpPath);
    assert.ok(getListingUrlPatterns("test-file-proof.ma", registryV1)[0].test("/v1-42"));

    const v2 = fixtureRegistry({ domain: "test-file-proof.ma", listing_url_patterns: ["/v2-\\d+$"] });
    writeFileSync(tmpPath, JSON.stringify(v2), "utf8");
    const registryV2 = loadSourceDomainRegistry(tmpPath);
    assert.equal(getListingUrlPatterns("test-file-proof.ma", registryV2)[0].test("/v1-42"), false);
    assert.ok(getListingUrlPatterns("test-file-proof.ma", registryV2)[0].test("/v2-42"));
  } finally {
    unlinkSync(tmpPath);
  }
});

// ---------------------------------------------------------------------
// 3. Fail-closed behavior
// ---------------------------------------------------------------------

test("fail-closed: unknown domain (no registry entry at all) -> zero patterns, never auto-approved", () => {
  const registry = fixtureRegistry({ domain: "known-domain.ma", listing_url_patterns: ["/x-\\d+$"] });
  const patterns = getListingUrlPatterns("totally-unknown-domain.ma", registry);
  assert.deepEqual(patterns, []);
});

test("fail-closed: known domain with no configured patterns -> zero patterns", () => {
  const registry = fixtureRegistry({ domain: "known-no-pattern.ma", listing_url_patterns: [] });
  const patterns = getListingUrlPatterns("known-no-pattern.ma", registry);
  assert.deepEqual(patterns, []);
});

test("fail-closed: an invalid regex source is skipped, never throws, never crashes the caller", () => {
  const registry = fixtureRegistry({ domain: "broken-pattern.ma", listing_url_patterns: ["/valid-\\d+$", "/unterminated-group(("] });
  let patterns: RegExp[] = [];
  assert.doesNotThrow(() => {
    patterns = getListingUrlPatterns("broken-pattern.ma", registry);
  });
  assert.equal(patterns.length, 1, "only the valid pattern survives, the broken one is skipped");
  assert.ok(patterns[0].test("/valid-123"));
});

test("fail-closed: an invalid regex never silently becomes 'match everything' -- it is dropped, not replaced by a permissive fallback", () => {
  const registry = fixtureRegistry({ domain: "only-broken.ma", listing_url_patterns: ["/unterminated-group(("] });
  const patterns = getListingUrlPatterns("only-broken.ma", registry);
  assert.deepEqual(patterns, [], "zero surviving patterns means strongIndividual can never be true for this domain, not 'match anything'");
});

test("fail-closed: sub-domain is NOT the same as the registered domain (no partial/fuzzy match)", () => {
  const registry = fixtureRegistry({ domain: "example.ma", listing_url_patterns: ["/x-\\d+$"] });
  const patterns = getListingUrlPatterns("sub.example.ma", registry);
  assert.deepEqual(patterns, [], "a subdomain must be registered explicitly -- it never inherits its parent domain's patterns implicitly");
});

test("fail-closed: malformed canonical URL (unparseable) never crashes classifyOpenSerpResult", () => {
  assert.doesNotThrow(() => {
    classifyOpenSerpResult({
      query: baseQuery,
      engine: "bing",
      discovered_at: "2026-07-20T11:00:00.000Z",
      fallbackRank: 1,
      result: { id: "malformed", title: "test", snippet: "test", url: "not a url at all ???" },
    });
  });
});

// ---------------------------------------------------------------------
// 4. Parity corpus -- domains whose pattern moved OUT of classify.ts
//    entirely (1immo.ma, barnes-marrakech.com,
//    limmobiliersansfrontieres.com, marrakechrealty.com had no prior
//    dedicated test coverage in this codebase; built fresh here against
//    the REAL registry to prove post-migration behavior matches the
//    pre-migration DOMAIN_RULES literally removed from classify.ts).
// ---------------------------------------------------------------------

function resultFor(domain: string, url: string, overrides: { title?: string; snippet?: string } = {}) {
  return classifyOpenSerpResult({
    query: baseQuery,
    engine: "bing" as const,
    discovered_at: "2026-07-20T11:00:00.000Z",
    fallbackRank: 1,
    result: {
      id: "parity",
      domain,
      title: overrides.title ?? "Appartement a vendre",
      snippet: overrides.snippet ?? "Bel appartement",
      url,
    },
  });
}

test("1immo.ma: slug+numeric-ID path matches strongIndividual (migrated pattern, was DOMAIN_RULES-only, no prior test)", () => {
  const actual = resultFor("1immo.ma", "https://1immo.ma/appartement-vente-marrakech-12345");
  assert.ok(actual);
  assert.ok(actual.classification_reasons.includes("strong_individual_path"));
});

test("1immo.ma: category/no-ID path does NOT match strongIndividual", () => {
  const actual = resultFor("1immo.ma", "https://1immo.ma/appartements-a-vendre");
  assert.ok(actual);
  assert.equal(actual.classification_reasons.includes("strong_individual_path"), false);
});

test("1immo.ma: case-insensitive flag preserved -- uppercase path segment still matches (exact pre-migration /i behavior)", () => {
  const actual = resultFor("1immo.ma", "https://1immo.ma/APPARTEMENT-VENTE-MARRAKECH-12345");
  assert.ok(actual);
  assert.ok(actual.classification_reasons.includes("strong_individual_path"));
});

test("barnes-marrakech.com: /vente/<slug>/<id> matches strongIndividual", () => {
  const actual = resultFor("barnes-marrakech.com", "https://barnes-marrakech.com/vente/villa-hivernage/98765");
  assert.ok(actual);
  assert.ok(actual.classification_reasons.includes("strong_individual_path"));
});

test("barnes-marrakech.com: /vente/<slug> with no trailing numeric ID does NOT match", () => {
  const actual = resultFor("barnes-marrakech.com", "https://barnes-marrakech.com/vente/villa-hivernage");
  assert.ok(actual);
  assert.equal(actual.classification_reasons.includes("strong_individual_path"), false);
});

test("barnes-marrakech.com: /location/ path does NOT match (pattern requires literal 'vente')", () => {
  const actual = resultFor("barnes-marrakech.com", "https://barnes-marrakech.com/location/villa-hivernage/98765");
  assert.ok(actual);
  assert.equal(actual.classification_reasons.includes("strong_individual_path"), false);
});

test("limmobiliersansfrontieres.com: /property/<slug> matches strongIndividual", () => {
  const actual = resultFor("limmobiliersansfrontieres.com", "https://limmobiliersansfrontieres.com/property/villa-marrakech-123");
  assert.ok(actual);
  assert.ok(actual.classification_reasons.includes("strong_individual_path"));
});

test("limmobiliersansfrontieres.com: /properties (plural, category) does NOT match", () => {
  const actual = resultFor("limmobiliersansfrontieres.com", "https://limmobiliersansfrontieres.com/properties");
  assert.ok(actual);
  assert.equal(actual.classification_reasons.includes("strong_individual_path"), false);
});

test("marrakechrealty.com: /property/<slug> matches strongIndividual", () => {
  const actual = resultFor("marrakechrealty.com", "https://marrakechrealty.com/property/riad-medina-456");
  assert.ok(actual);
  assert.ok(actual.classification_reasons.includes("strong_individual_path"));
});

test("marrakechrealty.com: /contact (unrelated page) does NOT match", () => {
  const actual = resultFor("marrakechrealty.com", "https://marrakechrealty.com/contact");
  assert.ok(actual);
  assert.equal(actual.classification_reasons.includes("strong_individual_path"), false);
});

// ---------------------------------------------------------------------
// 5. Static proof: no strongIndividual hardcode remains in classify.ts
// ---------------------------------------------------------------------

test("classify.ts's PathRules type/DOMAIN_RULES no longer declare a strongIndividual field (static source check)", () => {
  const source = readFileSync(join(process.cwd(), "lib/openserp-ingestion/classify.ts"), "utf8");
  // The pre-migration PathRules type declared `strongIndividual?: RegExp[];`
  // (an OPTIONAL field, marked with `?`). That exact declaration must be
  // gone. The still-legitimate `strongIndividual: boolean` (the *output*
  // signal name in detectUrlSignals' own return type/local variable,
  // fed by getListingUrlPatterns, not a DOMAIN_RULES field) is untouched
  // and correctly still present -- this check targets only the optional-
  // field form specific to the old hardcoded architecture.
  assert.equal(/strongIndividual\?\s*:\s*RegExp/.test(source), false, "no `strongIndividual?: RegExp[]` field declaration should remain in classify.ts");
  assert.equal(/DOMAIN_RULES\s*=\s*\{[\s\S]*?strongIndividual\s*:\s*\[/.test(source), false, "DOMAIN_RULES object literal must not assign a strongIndividual array to any domain");
});

test("classify.ts imports getListingUrlPatterns from domain-registry.ts (static source check)", () => {
  const source = readFileSync(join(process.cwd(), "lib/openserp-ingestion/classify.ts"), "utf8");
  assert.ok(/import\s*\{[^}]*getListingUrlPatterns[^}]*\}\s*from\s*["']\.\/domain-registry["']/.test(source));
});
