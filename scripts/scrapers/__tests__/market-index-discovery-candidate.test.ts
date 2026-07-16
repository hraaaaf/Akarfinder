// AKARFINDER-MARKET-INDEX-FOUNDATION-1 — DiscoveryCandidate tests (mission section 19.A).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateDiscoveryCandidate } from "../../../lib/market-index/market-index-validation.js";
import {
  computeDiscoveryCandidateIdempotencyKey,
  computeQueryHash,
} from "../../../lib/market-index/market-index-identifiers.js";
import {
  InMemoryDiscoveryCandidateRepository,
} from "../../../lib/market-index/market-index-repository.js";

describe("DiscoveryCandidate — idempotence", () => {
  it("computes the same idempotency key for the same provider/query/canonical URL", () => {
    const queryHash = computeQueryHash("openserp", "appartement rabat");
    const keyA = computeDiscoveryCandidateIdempotencyKey({
      provider: "openserp",
      queryHash,
      canonicalUrl: "https://mubawab.ma/a/123",
    });
    const keyB = computeDiscoveryCandidateIdempotencyKey({
      provider: "openserp",
      queryHash,
      canonicalUrl: "https://mubawab.ma/a/123",
    });
    assert.equal(keyA, keyB);
    assert.ok(keyA);
  });

  it("returns null when canonicalUrl is absent — no key invented for missing data", () => {
    const key = computeDiscoveryCandidateIdempotencyKey({
      provider: "openserp",
      queryHash: "abc",
      canonicalUrl: null,
    });
    assert.equal(key, null);
  });

  it("repository does not create a second row for the same idempotency triple", async () => {
    const repo = new InMemoryDiscoveryCandidateRepository();
    const queryHash = computeQueryHash("openserp", "appartement casablanca");
    const existing = await repo.findByIdempotencyKey("openserp", queryHash, "https://mubawab.ma/a/456");
    assert.equal(existing, null);

    await repo.create({
      provider: "openserp",
      discovery_query: "appartement casablanca",
      query_hash: queryHash,
      result_rank: 1,
      source_domain: "mubawab.ma",
      source_url: "https://mubawab.ma/a/456",
      canonical_url: "https://mubawab.ma/a/456",
      title: "Appartement",
      snippet: "Bel appartement",
      discovery_status: "discovered",
      compliance_status: null,
      content_fingerprint: null,
      metadata: null,
    });

    const found = await repo.findByIdempotencyKey("openserp", queryHash, "https://mubawab.ma/a/456");
    assert.ok(found);
    assert.equal(repo.all().length, 1);
  });
});

describe("DiscoveryCandidate — invalid URL refused", () => {
  it("rejects a candidate with a malformed source_url", () => {
    const result = validateDiscoveryCandidate({
      provider: "openserp",
      source_domain: "mubawab.ma",
      source_url: "not a url",
    });
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.ok(result.issues.some((i) => i.field === "source_url"));
    }
  });

  it("accepts a candidate with a well-formed source_url", () => {
    const result = validateDiscoveryCandidate({
      provider: "openserp",
      source_domain: "mubawab.ma",
      source_url: "https://mubawab.ma/fr/a/123/appartement",
    });
    assert.equal(result.valid, true);
  });
});

describe("DiscoveryCandidate — PII forbidden", () => {
  it("rejects a snippet containing a Moroccan phone number", () => {
    const result = validateDiscoveryCandidate({
      provider: "openserp",
      source_domain: "mubawab.ma",
      source_url: "https://mubawab.ma/fr/a/123",
      snippet: "Contactez le 0612345678 pour visiter",
    });
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.ok(result.issues.some((i) => i.field === "snippet" && i.reason.includes("phone")));
    }
  });

  it("rejects a title containing an email address", () => {
    const result = validateDiscoveryCandidate({
      provider: "openserp",
      source_domain: "mubawab.ma",
      source_url: "https://mubawab.ma/fr/a/123",
      title: "Contactez vendeur@example.com",
    });
    assert.equal(result.valid, false);
  });

  it("rejects metadata mentioning WhatsApp", () => {
    const result = validateDiscoveryCandidate({
      provider: "openserp",
      source_domain: "mubawab.ma",
      source_url: "https://mubawab.ma/fr/a/123",
      metadata: { contact_hint: "Disponible sur WhatsApp" },
    });
    assert.equal(result.valid, false);
  });
});

describe("DiscoveryCandidate — raw HTML forbidden", () => {
  it("rejects a snippet containing HTML markup", () => {
    const result = validateDiscoveryCandidate({
      provider: "openserp",
      source_domain: "mubawab.ma",
      source_url: "https://mubawab.ma/fr/a/123",
      snippet: "<div class=\"price\">1200000 DH</div>",
    });
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.ok(result.issues.some((i) => i.reason.includes("HTML")));
    }
  });
});

describe("DiscoveryCandidate — provenance required", () => {
  it("rejects a candidate with an empty provider", () => {
    const result = validateDiscoveryCandidate({
      provider: "",
      source_domain: "mubawab.ma",
      source_url: "https://mubawab.ma/fr/a/123",
    });
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.ok(result.issues.some((i) => i.field === "provider"));
    }
  });
});
