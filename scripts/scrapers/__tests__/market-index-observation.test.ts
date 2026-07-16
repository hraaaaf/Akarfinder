// AKARFINDER-MARKET-INDEX-FOUNDATION-1 — Observation tests (mission section 19.C).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InMemoryObservationRepository } from "../../../lib/market-index/market-index-repository.js";
import { recordObservationIfChanged } from "../../../lib/market-index/market-index-service.js";

function baseInput(overrides: Partial<Parameters<typeof recordObservationIfChanged>[1]> = {}) {
  return {
    sourceOfferId: 1,
    observedAtIso: "2026-07-16T10:00:00.000Z",
    displayedPrice: 1200000,
    currency: "MAD",
    surfaceM2: 90,
    titleFingerprint: "fp1",
    title: "Appartement 90m2",
    description: "Bel appartement lumineux",
    sourceStatus: "active",
    availabilityClaim: "disponible",
    observationOrigin: "discovery_ingestion",
    ingestionRunId: "run-1",
    ...overrides,
  };
}

describe("Observation — append-only", () => {
  it("repository interface has no update/delete method", () => {
    const repo = new InMemoryObservationRepository();
    assert.equal((repo as unknown as { update?: unknown }).update, undefined);
    assert.equal((repo as unknown as { delete?: unknown }).delete, undefined);
  });
});

describe("Observation — duplication avoided within the same hour bucket + fingerprint", () => {
  it("does not create a second row for an identical re-observation in the same hour", async () => {
    const repo = new InMemoryObservationRepository();
    const first = await recordObservationIfChanged(repo, baseInput());
    assert.equal(first.created, true);

    const second = await recordObservationIfChanged(repo, baseInput({ observedAtIso: "2026-07-16T10:45:00.000Z" }));
    assert.equal(second.created, false);
    assert.equal(second.observation.id, first.observation.id);
    assert.equal(repo.all().length, 1);
  });
});

describe("Observation — new row created when price or content changes", () => {
  it("creates a new observation when the price changes, even within the same hour", async () => {
    const repo = new InMemoryObservationRepository();
    await recordObservationIfChanged(repo, baseInput());
    const changed = await recordObservationIfChanged(
      repo,
      baseInput({ displayedPrice: 1250000, description: "Bel appartement lumineux, prix revu" }),
    );
    assert.equal(changed.created, true);
    assert.equal(repo.all().length, 2);
  });

  it("creates a new observation for a later hour even with identical content", async () => {
    const repo = new InMemoryObservationRepository();
    await recordObservationIfChanged(repo, baseInput());
    const later = await recordObservationIfChanged(repo, baseInput({ observedAtIso: "2026-07-17T10:00:00.000Z" }));
    assert.equal(later.created, true);
    assert.equal(repo.all().length, 2);
  });
});

describe("Observation — timestamp required", () => {
  it("every created observation carries observed_at and created_at", async () => {
    const repo = new InMemoryObservationRepository();
    const result = await recordObservationIfChanged(repo, baseInput());
    assert.ok(result.observation.observed_at);
    assert.ok(result.observation.created_at);
  });
});

describe("Observation — no invented history", () => {
  it("does not create anything unless recordObservationIfChanged is explicitly called", async () => {
    const repo = new InMemoryObservationRepository();
    assert.equal(repo.all().length, 0);
    assert.equal(await repo.findLatest(999), null);
  });
});
