export const LEAD_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const LEAD_RATE_LIMIT_MAX_PER_PHONE = 3;
export const LEAD_RATE_LIMIT_RETRY_AFTER_SECONDS = Math.ceil(LEAD_RATE_LIMIT_WINDOW_MS / 1000);

export function leadRateLimitCutoff(now = Date.now()): string {
  return new Date(now - LEAD_RATE_LIMIT_WINDOW_MS).toISOString();
}

export function isLeadRateLimited(recentCount: number): boolean {
  return Number.isFinite(recentCount) && recentCount >= LEAD_RATE_LIMIT_MAX_PER_PHONE;
}
