import { decideRetry, type AttemptResult, type RetryDecision, type ScheduledRecrawl } from "./recrawl-scheduler.js";

export type ClaimedRecrawl = ScheduledRecrawl & {
  lease_token: string;
};

export type FetchExecutionResult = AttemptResult & {
  observed: boolean;
  completed_at: string;
  metadata?: Record<string, unknown>;
};

export type RecrawlWorkerRepository = {
  claimDue(input: { worker_id: string; limit: number; now: string }): Promise<ClaimedRecrawl[]>;
  recordAttempt(input: {
    job: ClaimedRecrawl;
    result: FetchExecutionResult;
    retry: RetryDecision;
  }): Promise<void>;
  releaseClaim(input: { job: ClaimedRecrawl; reason: string }): Promise<void>;
};

export type RecrawlFetcher = {
  execute(job: ClaimedRecrawl): Promise<FetchExecutionResult>;
};

export type WorkerRunResult = {
  worker_id: string;
  dry_run: boolean;
  claimed: number;
  executed: number;
  succeeded: number;
  observed: number;
  failed: number;
  blocked: number;
  released: number;
};

export async function runRecrawlWorker(input: {
  repository: RecrawlWorkerRepository;
  fetcher: RecrawlFetcher;
  worker_id: string;
  limit: number;
  now: string;
  dry_run?: boolean;
}): Promise<WorkerRunResult> {
  if (!input.worker_id.trim()) throw new Error("worker_id is required");
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 500) {
    throw new Error("limit must be an integer between 1 and 500");
  }
  const dryRun = input.dry_run !== false;
  const jobs = await input.repository.claimDue({ worker_id: input.worker_id, limit: input.limit, now: input.now });
  const summary: WorkerRunResult = {
    worker_id: input.worker_id,
    dry_run: dryRun,
    claimed: jobs.length,
    executed: 0,
    succeeded: 0,
    observed: 0,
    failed: 0,
    blocked: 0,
    released: 0,
  };

  for (const job of jobs) {
    if (dryRun) {
      await input.repository.releaseClaim({ job, reason: "dry_run" });
      summary.released += 1;
      continue;
    }

    try {
      const result = await input.fetcher.execute(job);
      const retry = decideRetry(result, job.failure_count, result.completed_at);
      await input.repository.recordAttempt({ job, result, retry });
      summary.executed += 1;
      if (result.kind === "success") summary.succeeded += 1;
      else summary.failed += 1;
      if (result.observed) summary.observed += 1;
      if (retry.disposition === "blocked") summary.blocked += 1;
    } catch (error) {
      await input.repository.releaseClaim({
        job,
        reason: error instanceof Error ? `worker_exception:${error.message}` : "worker_exception:unknown",
      });
      summary.failed += 1;
      summary.released += 1;
    }
  }

  return summary;
}
