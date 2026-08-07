import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  adaptB3UnregisteredReserveRows,
  classifyReserveDomainForReview,
} from "../existing-reserve-adapter";

describe("DATA-1 Existing Reserve Adapter", () => {
  it("maps only unregistered-source reserve rows without inferring permissions", () => {
    const observations = adaptB3UnregisteredReserveRows([
      {
        source_domain: "rabatimmo.ma",
        canonical_url: "https://rabatimmo.ma/annonce/1",
        provider: "openserp",
        last_seen_at: "2026-08-05T17:11:48.944Z",
        decision: "reserve_unregistered_source",
      },
    ]);

    assert.equal(observations.length, 1);
    assert.equal(observations[0]!.registered, false);
    assert.equal(observations[0]!.reviewState, "UNREVIEWED");
    assert.equal(observations[0]!.effectivePolicy, undefined);
  });

  it("rejects rows from any other reserve or qualified lane", () => {
    assert.throws(
      () =>
        adaptB3UnregisteredReserveRows([
          {
            source_domain: "example.ma",
            canonical_url: "https://example.ma/a",
            provider: "openserp",
            decision: "qualified_internal_signal",
          },
        ]),
      /not an unregistered-source reserve candidate/,
    );
  });

  it("rejects source-domain and URL-host mismatches", () => {
    assert.throws(
      () =>
        adaptB3UnregisteredReserveRows([
          {
            source_domain: "example.ma",
            canonical_url: "https://other.ma/a",
            provider: "openserp",
            decision: "reserve_unregistered_source",
          },
        ]),
      /does not match canonical_url hostname/,
    );
  });

  it("marks known social/search platforms as noise", () => {
    assert.deepEqual(classifyReserveDomainForReview("facebook.com"), {
      domain: "facebook.com",
      priority: "NOISE",
      reasons: ["known_non_property_platform"],
    });
    assert.equal(classifyReserveDomainForReview("support.google.com").priority, "NOISE");
  });

  it("uses domain-name evidence only as review priority, not classification truth", () => {
    const high = classifyReserveDomainForReview("rabatimmo.ma");
    assert.equal(high.priority, "HIGH");
    assert.ok(high.reasons.includes("real_estate_domain_name_signal"));
    assert.ok(high.reasons.includes("morocco_ccTLD_signal"));

    const classified = classifyReserveDomainForReview("annoncesmaroc.ma");
    assert.equal(classified.priority, "HIGH");
    assert.ok(classified.reasons.includes("classified_domain_name_signal"));

    const genericMa = classifyReserveDomainForReview("example.ma");
    assert.equal(genericMa.priority, "MEDIUM");

    const unknown = classifyReserveDomainForReview("example.com");
    assert.equal(unknown.priority, "LOW");
  });
});
