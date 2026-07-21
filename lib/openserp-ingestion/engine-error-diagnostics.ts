// OPENSERP-ENGINE-FAILURE-OBSERVABILITY-1 -- purely additive diagnostic
// layer for engine-call failures. Does NOT replace or alter
// run-orchestrator.ts's existing categorizeError() (which still feeds
// captcha_count/status_403_429/timeout_count and, through those, the
// adaptive budget/suspension strategy in budget-policy.ts) -- that
// function and its behavior stay byte-identical. This module only adds a
// finer-grained, separately-tallied classification plus a sanitized,
// structured log line per engine-call attempt, so a future real run can
// reveal exactly why a batch of attempts fell into the generic "other"
// bucket instead of leaving that bucket unexplained the way Run #12 did.

export type EngineErrorCategory =
  | "timeout"
  | "captcha"
  | "http_403"
  | "http_429"
  | "dns_network"
  | "malformed_response"
  | "unknown";

// Node.js system error codes that indicate the engine (HTTP endpoint or
// CLI binary) could not be reached at all, as opposed to being reached and
// responding with an unexpected status/body.
const DNS_NETWORK_ERROR_CODES = new Set([
  "ENOTFOUND",
  "ECONNREFUSED",
  "ECONNRESET",
  "EAI_AGAIN",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ENOENT", // missing CLI binary (spawn ENOENT) -- can never reach the engine either
  "EPIPE",
]);

export function classifyEngineErrorDetail(input: {
  outcome?: string | null;
  errorName?: string | null;
  errorCode?: string | null;
  httpStatus?: number | null;
  message: string;
}): EngineErrorCategory {
  if (input.outcome === "engine_timeout") return "timeout";
  const message = input.message.toLowerCase();
  if (message.includes("captcha")) return "captcha";
  if (input.httpStatus === 403) return "http_403";
  if (input.httpStatus === 429) return "http_429";
  if (input.errorCode && DNS_NETWORK_ERROR_CODES.has(input.errorCode)) return "dns_network";
  if (input.outcome === "invalid_response" || input.errorName === "SyntaxError") return "malformed_response";
  return "unknown";
}

const MAX_SANITIZED_MESSAGE_LENGTH = 240;

// Never let a full URL, email, or long digit run (phone-like) reach a log
// line -- engine error messages are not expected to carry PII, but this is
// a defensive floor, not a trust assumption. Truncates long messages too,
// so a future unexpected error shape can never grow the log line
// unboundedly.
export function sanitizeEngineErrorMessage(message: string): string {
  if (!message) return "";
  let sanitized = message;
  sanitized = sanitized.replace(/https?:\/\/[^\s"')]+/gi, "<url-redacted>");
  sanitized = sanitized.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "<email-redacted>");
  sanitized = sanitized.replace(/\d{7,}/g, "<digits-redacted>");
  if (sanitized.length > MAX_SANITIZED_MESSAGE_LENGTH) {
    sanitized = `${sanitized.slice(0, MAX_SANITIZED_MESSAGE_LENGTH)}...<truncated>`;
  }
  return sanitized;
}

export type EngineCallLogEntry = {
  engine: string;
  query_id: string;
  attempt_outcome: "success" | "failure";
  category: EngineErrorCategory | "success";
  error_name: string | null;
  error_code: string | null;
  http_status: number | null;
  message: string | null;
  duration_ms: number;
  started_at: string;
  finished_at: string;
};

// One structured line per attempt, mirroring the [db-call] pattern already
// established by state/db-call-guard.ts. `message` must already be
// sanitized by the caller (via sanitizeEngineErrorMessage) before being
// passed in here -- this function does not re-sanitize.
export function logEngineCallAttempt(entry: EngineCallLogEntry): void {
  console.info(`[engine-call] ${JSON.stringify(entry)}`);
}
