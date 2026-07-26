export type CrawlPolicyState = "allowed" | "paused" | "robots_blocked" | "legal_review";
export type RecrawlReason =
  | "freshness_due"
  | "stale_verification"
  | "volatile_offer"
  | "reactivation_watch"
  | "withdrawn_verification"
  | "retry_due";

export type RecrawlCandidate = {
  source_offer_id: number;
  source_key: string;
  city: string | null;
  next_recheck_at: string;
  recrawl_priority: number;
  lifecycle_state: string;
  volatility_score: number | null;
  failure_count: number;
  policy_state: CrawlPolicyState;
};

export type CrawlBudget = {
  max_jobs: number;
  per_source_max: number;
  per_city_max: number;
};

export type ScheduledRecrawl = RecrawlCandidate & {
  effective_priority: number;
  reason: RecrawlReason;
};

export type RecrawlPlan = {
  evaluated_at: string;
  selected: ScheduledRecrawl[];
  skipped: Array<{ source_offer_id: number; reason: string }>;
};

function parseIso(value: string, field: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`${field} must be a valid ISO timestamp`);
  return parsed;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function reasonFor(candidate: RecrawlCandidate): RecrawlReason {
  if (candidate.failure_count > 0) return "retry_due";
  if (candidate.lifecycle_state === "withdrawn") return "withdrawn_verification";
  if (candidate.lifecycle_state === "reactivated") return "reactivation_watch";
  if (candidate.lifecycle_state === "probably_stale") return "stale_verification";
  if ((candidate.volatility_score ?? 0) >= 60) return "volatile_offer";
  return "freshness_due";
}

function effectivePriority(candidate: RecrawlCandidate, nowMs: number): number {
  const dueMs = parseIso(candidate.next_recheck_at, "next_recheck_at");
  const overdueHours = Math.max(0, (nowMs - dueMs) / 3_600_000);
  const overdueBoost = Math.min(30, overdueHours / 12);
  const volatilityBoost = Math.min(15, (candidate.volatility_score ?? 0) * 0.15);
  const retryBoost = Math.min(15, candidate.failure_count * 3);
  const withdrawnPenalty = candidate.lifecycle_state === "withdrawn" ? 20 : 0;
  return clamp(candidate.recrawl_priority + overdueBoost + volatilityBoost + retryBoost - withdrawnPenalty);
}

export function planRecrawls(candidates: RecrawlCandidate[], nowIso: string, budget: CrawlBudget): RecrawlPlan {
  const nowMs = parseIso(nowIso, "nowIso");
  if (!Number.isInteger(budget.max_jobs) || budget.max_jobs < 0) throw new Error("max_jobs must be a non-negative integer");
  if (!Number.isInteger(budget.per_source_max) || budget.per_source_max < 1) throw new Error("per_source_max must be a positive integer");
  if (!Number.isInteger(budget.per_city_max) || budget.per_city_max < 1) throw new Error("per_city_max must be a positive integer");

  const skipped: RecrawlPlan["skipped"] = [];
  const due: ScheduledRecrawl[] = [];
  const ids = new Set<number>();

  for (const candidate of candidates) {
    if (ids.has(candidate.source_offer_id)) throw new Error(`duplicate source_offer_id ${candidate.source_offer_id}`);
    ids.add(candidate.source_offer_id);
    if (candidate.policy_state !== "allowed") {
      skipped.push({ source_offer_id: candidate.source_offer_id, reason: `policy_${candidate.policy_state}` });
      continue;
    }
    if (parseIso(candidate.next_recheck_at, "next_recheck_at") > nowMs) {
      skipped.push({ source_offer_id: candidate.source_offer_id, reason: "not_due" });
      continue;
    }
    due.push({ ...candidate, effective_priority: effectivePriority(candidate, nowMs), reason: reasonFor(candidate) });
  }

  due.sort((a, b) =>
    b.effective_priority - a.effective_priority ||
    Date.parse(a.next_recheck_at) - Date.parse(b.next_recheck_at) ||
    a.source_key.localeCompare(b.source_key) ||
    a.source_offer_id - b.source_offer_id,
  );

  const sourceCounts = new Map<string, number>();
  const cityCounts = new Map<string, number>();
  const selected: ScheduledRecrawl[] = [];

  for (const candidate of due) {
    if (selected.length >= budget.max_jobs) {
      skipped.push({ source_offer_id: candidate.source_offer_id, reason: "global_budget_exhausted" });
      continue;
    }
    const sourceCount = sourceCounts.get(candidate.source_key) ?? 0;
    const cityKey = candidate.city?.trim().toLowerCase() || "__unknown__";
    const cityCount = cityCounts.get(cityKey) ?? 0;
    if (sourceCount >= budget.per_source_max) {
      skipped.push({ source_offer_id: candidate.source_offer_id, reason: "source_budget_exhausted" });
      continue;
    }
    if (cityCount >= budget.per_city_max) {
      skipped.push({ source_offer_id: candidate.source_offer_id, reason: "city_budget_exhausted" });
      continue;
    }
    selected.push(candidate);
    sourceCounts.set(candidate.source_key, sourceCount + 1);
    cityCounts.set(cityKey, cityCount + 1);
  }

  skipped.sort((a, b) => a.source_offer_id - b.source_offer_id || a.reason.localeCompare(b.reason));
  return { evaluated_at: nowIso, selected, skipped };
}

export type AttemptResult = {
  kind: "success" | "timeout" | "network" | "http" | "robots" | "policy";
  http_status?: number;
};

export type RetryDecision = {
  policy_state: CrawlPolicyState;
  failure_count: number;
  next_retry_at: string | null;
  disposition: "complete" | "retry" | "verify_later" | "blocked";
  reason: string;
};

export function decideRetry(result: AttemptResult, previousFailures: number, completedAtIso: string): RetryDecision {
  const completedAt = parseIso(completedAtIso, "completedAtIso");
  if (!Number.isInteger(previousFailures) || previousFailures < 0) throw new Error("previousFailures must be a non-negative integer");
  const schedule = (hours: number) => new Date(completedAt + hours * 3_600_000).toISOString();
  if (result.kind === "success") return { policy_state: "allowed", failure_count: 0, next_retry_at: null, disposition: "complete", reason: "success" };
  if (result.kind === "robots") return { policy_state: "robots_blocked", failure_count: previousFailures + 1, next_retry_at: null, disposition: "blocked", reason: "robots_disallow" };
  if (result.kind === "policy") return { policy_state: "legal_review", failure_count: previousFailures + 1, next_retry_at: null, disposition: "blocked", reason: "policy_review_required" };

  const failures = previousFailures + 1;
  const status = result.http_status ?? null;
  if (result.kind === "http" && (status === 401 || status === 403)) {
    return { policy_state: "legal_review", failure_count: failures, next_retry_at: null, disposition: "blocked", reason: `http_${status}_no_bypass` };
  }
  if (result.kind === "http" && status === 404) {
    return { policy_state: "allowed", failure_count: failures, next_retry_at: schedule(24 * 7), disposition: "verify_later", reason: "http_404_verify_withdrawal" };
  }
  if (result.kind === "http" && status === 429) {
    return { policy_state: "paused", failure_count: failures, next_retry_at: schedule(Math.min(24 * 7, 6 * 2 ** Math.min(failures - 1, 5))), disposition: "retry", reason: "http_429_backoff" };
  }
  const transient = result.kind === "timeout" || result.kind === "network" || (result.kind === "http" && status !== null && status >= 500);
  if (transient) {
    return { policy_state: "allowed", failure_count: failures, next_retry_at: schedule(Math.min(24, 2 ** Math.min(failures - 1, 4))), disposition: "retry", reason: result.kind === "http" ? `http_${status}_transient` : `${result.kind}_transient` };
  }
  return { policy_state: "legal_review", failure_count: failures, next_retry_at: null, disposition: "blocked", reason: "unclassified_failure" };
}
