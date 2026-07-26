import assert from "node:assert/strict";
import test from "node:test";

import {
  buildObservationTimeline,
  computeFreshness,
  deriveObservationEvents,
  deriveObservationLedger,
} from "../../../lib/observation-ledger/observation-ledger.js";
import type { Observation } from "../../../lib/market-index/market-index-types.js";

function observation(
  id: string,
  observedAt: string,
  overrides: Partial<Observation> = {},
): Observation {
  return {
    id,
    source_offer_id: 42,
    observed_at: observedAt,
    displayed_price: 1_200_000,
    currency: "MAD",
    surface_m2: 90,
    title_fingerprint: "title-v1",
    content_fingerprint: "content-v1",
    source_status: "active",
    availability_claim: "disponible",
    observation_origin: "discovery_ingestion",
    ingestion_run_id: "run-1",
    created_at: observedAt,
    ...overrides,
  };
}

test("first observation emits one deterministic event", () => {
  const current = observation("obs-1", "2026-07-01T10:00:00.000Z");
  const first = deriveObservationEvents(null, current);
  const repeated = deriveObservationEvents(null, current);

  assert.equal(first.length, 1);
  assert.equal(first[0].event_type, "first_observed");
  assert.equal(first[0].event_key, repeated[0].event_key);
});

test("price decrease keeps exact delta and percentage", () => {
  const previous = observation("obs-1", "2026-07-01T10:00:00.000Z");
  const current = observation("obs-2", "2026-07-02T10:00:00.000Z", {
    displayed_price: 1_080_000,
  });

  const events = deriveObservationEvents(previous, current);
  const decrease = events.find((entry) => entry.event_type === "price_decreased");

  assert.ok(decrease);
  assert.equal(decrease.previous_value, 1_200_000);
  assert.equal(decrease.current_value, 1_080_000);
  assert.equal(decrease.metadata.delta, -120_000);
  assert.equal(decrease.metadata.percentage, -10);
});

test("withdrawal and reactivation are distinct lifecycle events", () => {
  const active = observation("obs-1", "2026-07-01T10:00:00.000Z");
  const removed = observation("obs-2", "2026-07-02T10:00:00.000Z", {
    source_status: "removed",
  });
  const reactivated = observation("obs-3", "2026-07-03T10:00:00.000Z", {
    source_status: "active",
  });

  assert.ok(deriveObservationEvents(active, removed).some((entry) => entry.event_type === "withdrawn"));
  assert.ok(deriveObservationEvents(removed, reactivated).some((entry) => entry.event_type === "reactivated"));
});

test("content and surface changes are independently traceable", () => {
  const previous = observation("obs-1", "2026-07-01T10:00:00.000Z");
  const current = observation("obs-2", "2026-07-02T10:00:00.000Z", {
    content_fingerprint: "content-v2",
    surface_m2: 95,
  });

  const types = deriveObservationEvents(previous, current).map((entry) => entry.event_type);
  assert.ok(types.includes("content_changed"));
  assert.ok(types.includes("surface_changed"));
});

test("ledger sorts observations and isolates source offers", () => {
  const observations = [
    observation("obs-2", "2026-07-02T10:00:00.000Z", { displayed_price: 1_100_000 }),
    observation("other-1", "2026-07-01T08:00:00.000Z", { source_offer_id: 99 }),
    observation("obs-1", "2026-07-01T10:00:00.000Z"),
  ];

  const ledger = deriveObservationLedger(observations);
  assert.equal(ledger.filter((entry) => entry.event_type === "first_observed").length, 2);
  assert.equal(ledger.filter((entry) => entry.event_type === "price_decreased").length, 1);
});

test("comparison across source offers is refused", () => {
  const previous = observation("obs-1", "2026-07-01T10:00:00.000Z");
  const current = observation("obs-2", "2026-07-02T10:00:00.000Z", { source_offer_id: 99 });

  assert.throws(() => deriveObservationEvents(previous, current), /same source_offer_id/);
});

test("freshness is deterministic and degrades over time", () => {
  const fresh = computeFreshness("2026-07-26T09:00:00.000Z", "2026-07-26T10:00:00.000Z");
  const stale = computeFreshness("2026-05-01T10:00:00.000Z", "2026-07-26T10:00:00.000Z");

  assert.equal(fresh.band, "fresh");
  assert.equal(stale.band, "stale");
  assert.ok(fresh.score > stale.score);
});

test("timeline summarizes lifespan, changes and latest state", () => {
  const observations = [
    observation("obs-1", "2026-07-01T10:00:00.000Z"),
    observation("obs-2", "2026-07-11T10:00:00.000Z", {
      displayed_price: 1_100_000,
      source_status: "removed",
    }),
    observation("obs-3", "2026-07-21T10:00:00.000Z", {
      displayed_price: 1_100_000,
      source_status: "active",
    }),
  ];

  const timeline = buildObservationTimeline(observations, "2026-07-26T10:00:00.000Z");

  assert.ok(timeline);
  assert.equal(timeline.observation_count, 3);
  assert.equal(timeline.lifespan_days, 20);
  assert.equal(timeline.price_change_count, 1);
  assert.equal(timeline.withdrawal_count, 1);
  assert.equal(timeline.reactivation_count, 1);
  assert.equal(timeline.last_known_status, "active");
  assert.equal(timeline.last_known_price, 1_100_000);
});

test("empty timeline stays unknown instead of fabricating history", () => {
  assert.equal(buildObservationTimeline([], "2026-07-26T10:00:00.000Z"), null);
});
