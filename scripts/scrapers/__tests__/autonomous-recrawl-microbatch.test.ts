import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTONOMOUS_MICROBATCH_HARD_LIMIT,
  runAutonomousMicrobatch,
  type AutonomousMicrobatchRepository,
  type MicrobatchJobResult,
} from "../../../lib/recrawl/autonomous-microbatch.js";
import type { ClaimedRecrawl } from "../../../lib/recrawl/recrawl-worker.js";

function job(id: number): ClaimedRecrawl {
  return {
    source_offer_id: id,
    source_key: "mubawab",
    city: "Rabat",
    next_recrawl_at: "2026-07-27T00:00:00.000Z",
    priority: 100,
    reason: "test",
    policy_state: "allowed",
    failure_count: 0,
    publication_eligible: false,
    lease_token: `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
  };
}

function repository(jobs: ClaimedRecrawl[]) {
  const released: Array<{ id: number; reason: string }> = [];
  const repo: AutonomousMicrobatchRepository = {
    async claimDue(input) {
      assert.equal(input.source_key, "mubawab");
      return jobs;
    },
    async releaseClaim(input) {
      released.push({ id: input.job.source_offer_id, reason: input.reason });
    },
  };
  return { repo, released };
}

test("hard limit is three", () => {
  assert.equal(AUTONOMOUS_MICROBATCH_HARD_LIMIT, 3);
});

test("rejects unsupported sources and oversized batches", async () => {
  const { repo } = repository([]);
  const executor = { async execute(): Promise<MicrobatchJobResult> { throw new Error("not called"); } };
  await assert.rejects(
    runAutonomousMicrobatch({ repository: repo, executor, worker_id: "w", source_key: "other", limit: 1, now: new Date().toISOString() }),
    /source_not_allowed/,
  );
  await assert.rejects(
    runAutonomousMicrobatch({ repository: repo, executor, worker_id: "w", source_key: "mubawab", limit: 4, now: new Date().toISOString() }),
    /between 1 and 3/,
  );
});

test("dry-run releases every claim without execution", async () => {
  const { repo, released } = repository([job(1), job(2), job(3)]);
  let executions = 0;
  const report = await runAutonomousMicrobatch({
    repository: repo,
    executor: { async execute() { executions += 1; throw new Error("not expected"); } },
    worker_id: "dry",
    source_key: "mubawab",
    limit: 3,
    now: new Date().toISOString(),
  });
  assert.equal(executions, 0);
  assert.equal(report.released, 3);
  assert.equal(report.executed, 0);
  assert.equal(report.publication_eligible, false);
  assert.equal(released.length, 3);
});

test("executes sequentially and reports committed and unchanged", async () => {
  const { repo } = repository([job(1), job(2)]);
  const order: number[] = [];
  const report = await runAutonomousMicrobatch({
    repository: repo,
    executor: {
      async execute(current) {
        order.push(current.source_offer_id);
        return {
          source_offer_id: current.source_offer_id,
          source_key: current.source_key,
          outcome: current.source_offer_id === 1 ? "committed" : "unchanged",
          publication_eligible: false,
        };
      },
    },
    worker_id: "write",
    source_key: "mubawab",
    limit: 2,
    now: new Date().toISOString(),
    dry_run: false,
  });
  assert.deepEqual(order, [1, 2]);
  assert.equal(report.committed, 1);
  assert.equal(report.unchanged, 1);
  assert.equal(report.executed, 2);
  assert.equal(report.circuit_open, false);
});

test("blocked result opens circuit and releases remaining claims", async () => {
  const { repo, released } = repository([job(1), job(2), job(3)]);
  const order: number[] = [];
  const report = await runAutonomousMicrobatch({
    repository: repo,
    executor: {
      async execute(current) {
        order.push(current.source_offer_id);
        return {
          source_offer_id: current.source_offer_id,
          source_key: current.source_key,
          outcome: "blocked",
          publication_eligible: false,
        };
      },
    },
    worker_id: "blocked",
    source_key: "mubawab",
    limit: 3,
    now: new Date().toISOString(),
    dry_run: false,
  });
  assert.deepEqual(order, [1]);
  assert.equal(report.blocked, 1);
  assert.equal(report.released, 2);
  assert.equal(report.circuit_open, true);
  assert.deepEqual(released.map((item) => item.id), [2, 3]);
});

test("exception releases current and remaining claims", async () => {
  const { repo, released } = repository([job(1), job(2)]);
  const report = await runAutonomousMicrobatch({
    repository: repo,
    executor: { async execute() { throw new Error("boom"); } },
    worker_id: "exception",
    source_key: "mubawab",
    limit: 2,
    now: new Date().toISOString(),
    dry_run: false,
  });
  assert.equal(report.failed, 1);
  assert.equal(report.released, 2);
  assert.equal(report.circuit_open, true);
  assert.match(released[0].reason, /boom/);
  assert.equal(released[1].reason, "autonomous_microbatch_circuit_open");
});
