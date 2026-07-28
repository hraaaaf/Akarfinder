import type { ClaimedRecrawl } from "./recrawl-worker.js";

export const AUTONOMOUS_MICROBATCH_HARD_LIMIT = 3;

export type MicrobatchOutcome =
  | "committed"
  | "unchanged"
  | "retry"
  | "blocked"
  | "failed";

export type MicrobatchJobResult = {
  source_offer_id: number;
  source_key: string;
  outcome: MicrobatchOutcome;
  observation_id?: string;
  event_count?: number;
  publication_eligible: false;
  detail?: string;
};

export type AutonomousMicrobatchRepository = {
  claimDue(input: {
    worker_id: string;
    limit: number;
    now: string;
    source_key: string;
  }): Promise<ClaimedRecrawl[]>;
  releaseClaim(input: { job: ClaimedRecrawl; reason: string }): Promise<void>;
};

export type AutonomousMicrobatchExecutor = {
  execute(job: ClaimedRecrawl): Promise<MicrobatchJobResult>;
};

export type AutonomousMicrobatchReport = {
  worker_id: string;
  source_key: string;
  dry_run: boolean;
  requested_limit: number;
  hard_limit: number;
  claimed: number;
  executed: number;
  committed: number;
  unchanged: number;
  retry: number;
  blocked: number;
  failed: number;
  released: number;
  circuit_open: boolean;
  publication_eligible: false;
  results: MicrobatchJobResult[];
};

function validateInput(input: {
  worker_id: string;
  source_key: string;
  limit: number;
}): void {
  if (!input.worker_id.trim()) throw new Error("worker_id is required");
  if (input.source_key !== "mubawab") {
    throw new Error("autonomous_microbatch_source_not_allowed");
  }
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > AUTONOMOUS_MICROBATCH_HARD_LIMIT) {
    throw new Error(`limit must be an integer between 1 and ${AUTONOMOUS_MICROBATCH_HARD_LIMIT}`);
  }
}

export async function runAutonomousMicrobatch(input: {
  repository: AutonomousMicrobatchRepository;
  executor: AutonomousMicrobatchExecutor;
  worker_id: string;
  source_key: string;
  limit: number;
  now: string;
  dry_run?: boolean;
}): Promise<AutonomousMicrobatchReport> {
  validateInput(input);
  const dryRun = input.dry_run !== false;
  const jobs = await input.repository.claimDue({
    worker_id: input.worker_id.trim(),
    source_key: input.source_key,
    limit: input.limit,
    now: input.now,
  });

  if (jobs.length > AUTONOMOUS_MICROBATCH_HARD_LIMIT || jobs.length > input.limit) {
    throw new Error("repository_claim_exceeded_microbatch_limit");
  }
  if (jobs.some((job) => job.source_key !== input.source_key)) {
    throw new Error("repository_claim_returned_wrong_source");
  }

  const report: AutonomousMicrobatchReport = {
    worker_id: input.worker_id.trim(),
    source_key: input.source_key,
    dry_run: dryRun,
    requested_limit: input.limit,
    hard_limit: AUTONOMOUS_MICROBATCH_HARD_LIMIT,
    claimed: jobs.length,
    executed: 0,
    committed: 0,
    unchanged: 0,
    retry: 0,
    blocked: 0,
    failed: 0,
    released: 0,
    circuit_open: false,
    publication_eligible: false,
    results: [],
  };

  if (dryRun) {
    for (const job of jobs) {
      await input.repository.releaseClaim({ job, reason: "autonomous_microbatch_dry_run" });
      report.released += 1;
    }
    return report;
  }

  for (let index = 0; index < jobs.length; index += 1) {
    const job = jobs[index];
    if (report.circuit_open) {
      await input.repository.releaseClaim({ job, reason: "autonomous_microbatch_circuit_open" });
      report.released += 1;
      continue;
    }

    try {
      const result = await input.executor.execute(job);
      if (result.publication_eligible !== false) {
        throw new Error("publication_eligibility_invariant_violated");
      }
      report.results.push(result);
      report.executed += 1;
      report[result.outcome] += 1;

      if (result.outcome === "blocked") {
        report.circuit_open = true;
      }
    } catch (error) {
      report.failed += 1;
      report.circuit_open = true;
      await input.repository.releaseClaim({
        job,
        reason: error instanceof Error
          ? `autonomous_microbatch_exception:${error.message}`
          : "autonomous_microbatch_exception:unknown",
      });
      report.released += 1;
    }
  }

  return report;
}
