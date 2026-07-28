import test from "node:test";
import assert from "node:assert/strict";
import { decideRetry, planRecrawls, type RecrawlCandidate } from "../../../lib/recrawl/recrawl-scheduler.js";
import { runRecrawlWorker, type ClaimedRecrawl, type RecrawlWorkerRepository } from "../../../lib/recrawl/recrawl-worker.js";

const NOW = "2026-07-26T18:00:00.000Z";

function candidate(id: number, overrides: Partial<RecrawlCandidate> = {}): RecrawlCandidate {
  return {
    source_offer_id: id,
    source_key: "source-a",
    city: "Casablanca",
    next_recheck_at: "2026-07-26T12:00:00.000Z",
    recrawl_priority: 50,
    lifecycle_state: "active",
    volatility_score: 10,
    failure_count: 0,
    policy_state: "allowed",
    ...overrides,
  };
}

test("scheduler is deterministic and respects global, source and city budgets", () => {
  const input = [
    candidate(1, { recrawl_priority: 90 }),
    candidate(2, { recrawl_priority: 80 }),
    candidate(3, { source_key: "source-b", recrawl_priority: 70 }),
    candidate(4, { source_key: "source-c", city: "Rabat", recrawl_priority: 60 }),
  ];
  const budget = { max_jobs: 3, per_source_max: 1, per_city_max: 2 };
  const a = planRecrawls(input, NOW, budget);
  const b = planRecrawls([...input].reverse(), NOW, budget);
  assert.deepEqual(a, b);
  assert.deepEqual(a.selected.map((row) => row.source_offer_id), [1, 3, 4]);
  assert.equal(a.skipped.find((row) => row.source_offer_id === 2)?.reason, "source_budget_exhausted");
});

test("scheduler never selects policy-blocked or not-due offers", () => {
  const result = planRecrawls(
    [
      candidate(1, { policy_state: "robots_blocked" }),
      candidate(2, { next_recheck_at: "2026-07-27T12:00:00.000Z" }),
      candidate(3),
    ],
    NOW,
    { max_jobs: 10, per_source_max: 10, per_city_max: 10 },
  );
  assert.deepEqual(result.selected.map((row) => row.source_offer_id), [3]);
  assert.equal(result.skipped.find((row) => row.source_offer_id === 1)?.reason, "policy_robots_blocked");
  assert.equal(result.skipped.find((row) => row.source_offer_id === 2)?.reason, "not_due");
});

test("403 and robots are blocked with no bypass retry", () => {
  assert.deepEqual(decideRetry({ kind: "http", http_status: 403 }, 0, NOW), {
    policy_state: "legal_review",
    failure_count: 1,
    next_retry_at: null,
    disposition: "blocked",
    reason: "http_403_no_bypass",
  });
  assert.equal(decideRetry({ kind: "robots" }, 0, NOW).policy_state, "robots_blocked");
});

test("transient errors back off and 404 only schedules withdrawal verification", () => {
  const timeout = decideRetry({ kind: "timeout" }, 2, NOW);
  assert.equal(timeout.disposition, "retry");
  assert.equal(timeout.next_retry_at, "2026-07-26T22:00:00.000Z");
  const missing = decideRetry({ kind: "http", http_status: 404 }, 0, NOW);
  assert.equal(missing.disposition, "verify_later");
  assert.equal(missing.reason, "http_404_verify_withdrawal");
});

function claimed(id: number): ClaimedRecrawl {
  return {
    ...candidate(id),
    effective_priority: 50,
    reason: "freshness_due",
    lease_token: `lease-${id}`,
  };
}

test("worker is dry-run by default and releases every claim without fetching", async () => {
  let fetched = 0;
  let released = 0;
  const repository: RecrawlWorkerRepository = {
    async claimDue() { return [claimed(1), claimed(2)]; },
    async recordAttempt() { throw new Error("must not persist in dry-run"); },
    async releaseClaim() { released += 1; },
  };
  const result = await runRecrawlWorker({
    repository,
    fetcher: { async execute() { fetched += 1; return { kind: "success", observed: true, completed_at: NOW }; } },
    worker_id: "worker-test",
    limit: 10,
    now: NOW,
  });
  assert.equal(fetched, 0);
  assert.equal(released, 2);
  assert.equal(result.dry_run, true);
  assert.equal(result.executed, 0);
});

test("write mode records factual outcomes", async () => {
  let recorded = 0;
  const repository: RecrawlWorkerRepository = {
    async claimDue() { return [claimed(1)]; },
    async recordAttempt({ retry }) { recorded += 1; assert.equal(retry.disposition, "complete"); },
    async releaseClaim() { throw new Error("success must not be released"); },
  };
  const result = await runRecrawlWorker({
    repository,
    fetcher: { async execute() { return { kind: "success", observed: true, completed_at: NOW }; } },
    worker_id: "worker-test",
    limit: 1,
    now: NOW,
    dry_run: false,
  });
  assert.equal(recorded, 1);
  assert.equal(result.succeeded, 1);
  assert.equal(result.observed, 1);
});
