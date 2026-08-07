import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildDomainCensus, canonicalizeCensusUrl } from "../domain-census";

describe("DATA-1 Domain Census Core", () => {
  it("canonicalizes www domains without inventing a source policy", () => {
    const result = canonicalizeCensusUrl("https://WWW.Example.ma/property/12#photos");
    assert.equal(result.domain, "example.ma");
    assert.equal(result.url, "https://example.ma/property/12");
  });

  it("aggregates duplicate discovery observations deterministically", () => {
    const report = buildDomainCensus(
      [
        {
          url: "https://www.agence.ma/property/a",
          provider: "common_crawl",
          observedAt: "2026-08-01T10:00:00+01:00",
          kindHint: "AGENCY",
          kindEvidence: "explicit directory classification",
          techSignals: ["WORDPRESS", "JSON_LD"],
          cities: ["Rabat"],
          registered: false,
        },
        {
          url: "https://agence.ma/property/a#gallery",
          provider: "openserp",
          observedAt: "2026-08-02T10:00:00+01:00",
          kindHint: "AGENCY",
          kindEvidence: "explicit directory classification",
          techSignals: ["SITEMAP"],
          cities: ["Rabat", "Temara"],
          registered: false,
        },
        {
          url: "https://agence.ma/property/b",
          provider: "openserp",
          observedAt: "2026-08-03T10:00:00+01:00",
          registered: false,
        },
      ],
      "2026-08-07T02:00:00+01:00",
    );

    assert.equal(report.domains, 1);
    assert.equal(report.observations, 3);
    assert.equal(report.unregisteredDomains, 1);

    const candidate = report.candidates[0]!;
    assert.equal(candidate.domain, "agence.ma");
    assert.equal(candidate.observedUrlCount, 2);
    assert.equal(candidate.observationCount, 3);
    assert.equal(candidate.kind, "AGENCY");
    assert.deepEqual(candidate.providers, [
      { provider: "openserp", observations: 2 },
      { provider: "common_crawl", observations: 1 },
    ]);
    assert.deepEqual(candidate.cities, ["Rabat", "Temara"]);
    assert.deepEqual(candidate.techSignals, ["JSON_LD", "SITEMAP", "WORDPRESS"]);
    assert.equal(candidate.effectivePolicy, null);
    assert.equal(candidate.reviewState, "UNREVIEWED");
    assert.deepEqual(candidate.blockers, []);
  });

  it("fails closed on conflicting organization-kind evidence", () => {
    const report = buildDomainCensus(
      [
        {
          url: "https://mixed.ma/a",
          provider: "directory_a",
          kindHint: "AGENCY",
          kindEvidence: "agency directory",
        },
        {
          url: "https://mixed.ma/b",
          provider: "directory_b",
          kindHint: "PROMOTER",
          kindEvidence: "promoter directory",
        },
      ],
      "2026-08-07T02:00:00+01:00",
    );

    const candidate = report.candidates[0]!;
    assert.equal(candidate.kind, "UNKNOWN");
    assert.ok(candidate.blockers.includes("conflicting_domain_kind_evidence"));
  });

  it("fails closed when registry evidence conflicts", () => {
    const report = buildDomainCensus(
      [
        { url: "https://registry-conflict.ma/a", provider: "a", registered: true },
        { url: "https://registry-conflict.ma/b", provider: "b", registered: false },
      ],
      "2026-08-07T02:00:00+01:00",
    );

    const candidate = report.candidates[0]!;
    assert.equal(candidate.registryState, "UNKNOWN");
    assert.ok(candidate.blockers.includes("conflicting_registry_evidence"));
  });

  it("rejects policy evidence for a source explicitly marked unregistered", () => {
    const report = buildDomainCensus(
      [
        {
          url: "https://unregistered.ma/a",
          provider: "existing_reserve",
          registered: false,
          effectivePolicy: "canonical_link_only",
        },
      ],
      "2026-08-07T02:00:00+01:00",
    );

    const candidate = report.candidates[0]!;
    assert.equal(candidate.registryState, "UNREGISTERED");
    assert.equal(candidate.effectivePolicy, null);
    assert.ok(candidate.blockers.includes("policy_without_registered_source"));
  });

  it("rejects invalid timestamps and unsupported protocols", () => {
    assert.throws(
      () =>
        buildDomainCensus(
          [{ url: "https://example.ma/a", provider: "x", observedAt: "not-a-date" }],
          "2026-08-07T02:00:00+01:00",
        ),
      /Invalid observedAt timestamp/,
    );
    assert.throws(() => canonicalizeCensusUrl("ftp://example.ma/a"), /Unsupported URL protocol/);
  });
});
