import test from "node:test";
import assert from "node:assert/strict";
import { evaluateFreshnessLifecycle } from "../../../lib/freshness-lifecycle/freshness-lifecycle-engine.js";
import type { Observation } from "../../../lib/market-index/market-index-types.js";

function observation(id: string, observedAt: string, overrides: Partial<Observation> = {}): Observation {
  return {
    id,
    source_offer_id: 42,
    observed_at: observedAt,
    displayed_price: 1_000_000,
    currency: "MAD",
    surface_m2: 90,
    title_fingerprint: "title-a",
    content_fingerprint: "content-a",
    source_status: "active",
    availability_claim: "disponible",
    observation_origin: "test",
    ingestion_run_id: "run-test",
    created_at: observedAt,
    ...overrides,
  };
}

test("empty history remains unknown instead of fabricated", () => {
  assert.equal(evaluateFreshnessLifecycle([], "2026-07-26T12:00:00.000Z"), null);
});

test("one fresh observation is newly_observed", () => {
  const result = evaluateFreshnessLifecycle(
    [observation("obs-1", "2026-07-26T11:00:00.000Z")],
    "2026-07-26T12:00:00.000Z",
  );
  assert.equal(result?.lifecycle_state, "newly_observed");
  assert.equal(result?.freshness_band, "fresh");
  assert.ok((result?.freshness_score ?? 0) > 90);
});

test("price change is classified without promoting it to availability proof", () => {
  const result = evaluateFreshnessLifecycle(
    [
      observation("obs-1", "2026-07-20T10:00:00.000Z"),
      observation("obs-2", "2026-07-25T10:00:00.000Z", { displayed_price: 950_000 }),
    ],
    "2026-07-26T10:00:00.000Z",
  );
  assert.equal(result?.lifecycle_state, "price_changed");
  assert.ok((result?.volatility_score ?? 0) > 0);
  assert.ok(result?.evidence_event_keys.some((key) => key.includes("price_decreased")));
});

test("removed source is withdrawn", () => {
  const result = evaluateFreshnessLifecycle(
    [
      observation("obs-1", "2026-07-20T10:00:00.000Z"),
      observation("obs-2", "2026-07-25T10:00:00.000Z", { source_status: "removed" }),
    ],
    "2026-07-26T10:00:00.000Z",
  );
  assert.equal(result?.lifecycle_state, "withdrawn");
  assert.equal(result?.lifecycle_score, 0);
});

test("removed then active is reactivated", () => {
  const result = evaluateFreshnessLifecycle(
    [
      observation("obs-1", "2026-07-20T10:00:00.000Z", { source_status: "removed" }),
      observation("obs-2", "2026-07-25T10:00:00.000Z", { source_status: "active" }),
    ],
    "2026-07-26T10:00:00.000Z",
  );
  assert.equal(result?.lifecycle_state, "reactivated");
});

test("old active observation is only probably stale, never withdrawn", () => {
  const result = evaluateFreshnessLifecycle(
    [observation("obs-1", "2026-05-01T10:00:00.000Z")],
    "2026-07-26T10:00:00.000Z",
  );
  assert.equal(result?.lifecycle_state, "probably_stale");
  assert.equal(result?.freshness_band, "stale");
  assert.deepEqual(result?.blockers, ["fresh_recheck_required"]);
});

test("cross-offer evaluation is refused", () => {
  assert.throws(() =>
    evaluateFreshnessLifecycle(
      [
        observation("obs-1", "2026-07-25T10:00:00.000Z"),
        observation("obs-2", "2026-07-26T10:00:00.000Z", { source_offer_id: 43 }),
      ],
      "2026-07-26T12:00:00.000Z",
    ),
  );
});

test("evaluation is deterministic", () => {
  const input = [
    observation("obs-1", "2026-07-20T10:00:00.000Z"),
    observation("obs-2", "2026-07-25T10:00:00.000Z", { content_fingerprint: "content-b" }),
  ];
  const a = evaluateFreshnessLifecycle(input, "2026-07-26T10:00:00.000Z");
  const b = evaluateFreshnessLifecycle([...input].reverse(), "2026-07-26T10:00:00.000Z");
  assert.deepEqual(a, b);
});
