import test from "node:test";
import assert from "node:assert/strict";

import {
  mapObservationRow,
  readObservationHistory,
  runObservationLedgerBackfill,
  type ObservationLedgerSupabaseClient,
} from "../../../lib/observation-ledger/supabase-observation-ledger.js";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    source_offer_id: 12,
    observed_at: "2026-07-20T10:00:00.000Z",
    displayed_price: "1200000",
    currency: "MAD",
    surface_m2: "90",
    title_fingerprint: "title-a",
    content_fingerprint: "content-a",
    source_status: "active",
    availability_claim: "disponible",
    observation_origin: "discovery_ingestion",
    ingestion_run_id: "run-1",
    created_at: "2026-07-20T10:00:01.000Z",
    ...overrides,
  };
}

function fakeClient(rows: unknown[]): ObservationLedgerSupabaseClient & { rpcCalls: Array<Record<string, unknown>> } {
  const rpcCalls: Array<Record<string, unknown>> = [];
  return {
    rpcCalls,
    from(table: string) {
      assert.equal(table, "source_offer_observations");
      return {
        select() {
          return {
            order() {
              return {
                order() {
                  return {
                    async range(from: number, to: number) {
                      return { data: rows.slice(from, to + 1), error: null };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
    async rpc(name: string, params: Record<string, unknown>) {
      assert.equal(name, "persist_observation_ledger_event");
      rpcCalls.push(params);
      return { data: { id: "persisted" }, error: null };
    },
  };
}

test("maps numeric Postgres values without losing source identity", () => {
  const observation = mapObservationRow(row());
  assert.equal(observation.source_offer_id, 12);
  assert.equal(observation.displayed_price, 1_200_000);
  assert.equal(observation.surface_m2, 90);
});

test("rejects unsafe or missing source_offer identifiers", () => {
  assert.throws(() => mapObservationRow(row({ source_offer_id: "not-a-number" })));
  assert.throws(() => mapObservationRow(row({ id: null })));
});

test("reads observation history page by page with a strict cap", async () => {
  const client = fakeClient([
    row(),
    row({ id: "00000000-0000-0000-0000-000000000002", observed_at: "2026-07-21T10:00:00.000Z" }),
    row({ id: "00000000-0000-0000-0000-000000000003", observed_at: "2026-07-22T10:00:00.000Z" }),
  ]);

  const observations = await readObservationHistory(client, { pageSize: 2, maxObservations: 3 });
  assert.equal(observations.length, 3);
});

test("dry-run derives events but performs no RPC write", async () => {
  const client = fakeClient([
    row(),
    row({
      id: "00000000-0000-0000-0000-000000000002",
      observed_at: "2026-07-21T10:00:00.000Z",
      displayed_price: "1100000",
      content_fingerprint: "content-b",
    }),
  ]);

  const result = await runObservationLedgerBackfill(client, {
    snapshot: "test_snapshot",
    dryRun: true,
  });

  assert.equal(result.observations_read, 2);
  assert.equal(result.events_derived, 3);
  assert.equal(result.events_persisted, 0);
  assert.equal(client.rpcCalls.length, 0);
});

test("write mode persists deterministic events through the RPC only", async () => {
  const client = fakeClient([
    row(),
    row({
      id: "00000000-0000-0000-0000-000000000002",
      observed_at: "2026-07-21T10:00:00.000Z",
      displayed_price: "1100000",
    }),
  ]);

  const result = await runObservationLedgerBackfill(client, {
    snapshot: "write_snapshot",
    dryRun: false,
  });

  assert.equal(result.events_derived, 2);
  assert.equal(result.events_persisted, 2);
  assert.equal(client.rpcCalls.length, 2);
  assert.equal(client.rpcCalls[0].p_input_snapshot, "write_snapshot");
  assert.match(String(client.rpcCalls[0].p_event_key), /^12:origin:/);
});

test("empty production history remains empty and never fabricates a first observation", async () => {
  const client = fakeClient([]);
  const result = await runObservationLedgerBackfill(client, {
    snapshot: "empty_snapshot",
    dryRun: false,
  });

  assert.equal(result.observations_read, 0);
  assert.equal(result.events_derived, 0);
  assert.equal(result.events_persisted, 0);
  assert.equal(client.rpcCalls.length, 0);
});
