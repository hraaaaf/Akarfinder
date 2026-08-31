import { canonicalizeSourceUrl } from "@/lib/openserp-ingestion/utils";

export const COMMON_CRAWL_COLLINFO_URL = "https://index.commoncrawl.org/collinfo.json";
export const EXACT_CDX_FALLBACK_INDEXES = ["CC-MAIN-2026-34", "CC-MAIN-2026-30", "CC-MAIN-2026-25"] as const;
export const EXACT_CDX_QUERY_LIMIT = 10;
const COMMON_CRAWL_USER_AGENT = "AkarFinder-CommonCrawl-Exact-Revalidation/1.0 (+https://github.com/hraaaaf/Akarfinder)";
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type StrictCommonCrawlPolicyRow = {
  source_domain: string;
  authorization_status: string | null;
  acquisition_mode: string | null;
  discovery_policy: string | null;
  display_policy: string | null;
  machine_gate: string | null;
  ingestion_gate: string | null;
  display_gate: string | null;
  no_bypass_required: boolean | null;
  allowed_discovery_channels: string[] | null;
  review_status: string | null;
  next_review_at: string | null;
  policy_effective_at: string | null;
  policy_expires_at: string | null;
  max_revalidation_interval_days: number | null;
  policy_hash: string | null;
};

export type StrictCommonCrawlPolicyDecision = {
  allowed: boolean;
  reason: string;
  source_domain: string;
  max_revalidation_interval_days: number | null;
  policy_hash: string | null;
};

export type ExactCdxRecord = {
  url: string;
  timestamp: string;
  status?: string;
  mime?: string;
  digest?: string;
  index: string;
};

export type ExactCdxClassification = {
  eligible: boolean;
  exact_records: number;
  exact_200_html_records: number;
  recent_exact_200_html_records: number;
  latest_exact_observed_at: string | null;
  latest_eligible_observed_at: string | null;
  reason: "recent_exact_200_html" | "no_exact_record" | "no_200_html" | "stale_only";
};

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, "");
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function evaluateStrictCommonCrawlPolicy(
  policy: StrictCommonCrawlPolicyRow | null | undefined,
  now: Date = new Date(),
): StrictCommonCrawlPolicyDecision {
  const base = {
    source_domain: normalizeDomain(policy?.source_domain ?? ""),
    max_revalidation_interval_days: policy?.max_revalidation_interval_days ?? null,
    policy_hash: policy?.policy_hash ?? null,
  };
  const deny = (reason: string): StrictCommonCrawlPolicyDecision => ({ ...base, allowed: false, reason });

  if (!policy || !base.source_domain) return deny("missing_policy");
  if (policy.no_bypass_required !== true) return deny("no_bypass_required_false");
  if (!policy.policy_hash?.trim()) return deny("missing_policy_hash");
  if (!(policy.allowed_discovery_channels ?? []).map((value) => value.toLowerCase()).includes("commoncrawl")) {
    return deny("commoncrawl_channel_not_allowed");
  }
  if (!(["current", "due_soon"] as const).includes(policy.review_status as "current" | "due_soon")) {
    return deny("review_not_current");
  }

  const nextReviewAt = parseDate(policy.next_review_at);
  const effectiveAt = parseDate(policy.policy_effective_at);
  const expiresAt = parseDate(policy.policy_expires_at);
  if (!nextReviewAt || nextReviewAt.getTime() <= now.getTime()) return deny("review_expired");
  if (!effectiveAt || effectiveAt.getTime() > now.getTime()) return deny("policy_not_effective");
  if (!expiresAt || expiresAt.getTime() <= now.getTime()) return deny("policy_expired");
  if (policy.authorization_status !== "unverified") return deny("authorization_not_unverified");
  if (policy.acquisition_mode !== "public_index_internal_only") return deny("wrong_acquisition_mode");
  if (policy.discovery_policy !== "public_index_only") return deny("wrong_discovery_policy");
  if (policy.display_policy !== "canonical_link_only") return deny("wrong_display_policy");
  if (policy.machine_gate !== "canonical_link_only") return deny("wrong_machine_gate");
  if (policy.ingestion_gate !== "canonical_link_only") return deny("wrong_ingestion_gate");
  if (policy.display_gate !== "external_tail_link_only") return deny("wrong_display_gate");
  if (!Number.isFinite(policy.max_revalidation_interval_days) || (policy.max_revalidation_interval_days ?? 0) <= 0) {
    return deny("invalid_revalidation_window");
  }

  return { ...base, allowed: true, reason: "allowed" };
}

export function buildExactCdxIndexUrl(canonicalUrl: string, index: string): string {
  return `https://index.commoncrawl.org/${index}-index?url=${encodeURIComponent(canonicalUrl)}&matchType=exact&output=json&fl=url,timestamp,status,mime,digest&limit=${EXACT_CDX_QUERY_LIMIT}`;
}

export function parseExactCdxJsonLine(line: string, index: string): ExactCdxRecord | null {
  if (!line.trim()) return null;
  try {
    const parsed = JSON.parse(line) as {
      url?: unknown;
      timestamp?: unknown;
      status?: unknown;
      mime?: unknown;
      mimetype?: unknown;
      digest?: unknown;
    };
    if (typeof parsed.url !== "string" || typeof parsed.timestamp !== "string") return null;
    return {
      url: parsed.url,
      timestamp: parsed.timestamp,
      status: parsed.status == null ? undefined : String(parsed.status),
      mime: parsed.mime == null && parsed.mimetype == null ? undefined : String(parsed.mime ?? parsed.mimetype),
      digest: parsed.digest == null ? undefined : String(parsed.digest),
      index,
    };
  } catch {
    return null;
  }
}

export function parseCommonCrawlTimestamp(value: string): Date | null {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
  return Number.isFinite(date.getTime()) ? date : null;
}

function canonicalEquals(left: string, right: string): boolean {
  const a = canonicalizeSourceUrl(left);
  const b = canonicalizeSourceUrl(right);
  return Boolean(a && b && a === b);
}

export function classifyExactCdxRecords(
  canonicalUrl: string,
  records: ExactCdxRecord[],
  maxRevalidationIntervalDays: number,
  now: Date = new Date(),
): ExactCdxClassification {
  const exact = records.filter((record) => canonicalEquals(record.url, canonicalUrl));
  const html200 = exact.filter((record) => record.status === "200" && (record.mime ?? "").toLowerCase().startsWith("text/html"));
  const cutoff = now.getTime() - maxRevalidationIntervalDays * DAY_MS;
  const futureCeiling = now.getTime() + FIVE_MINUTES_MS;
  const recent = html200
    .map((record) => ({ record, observedAt: parseCommonCrawlTimestamp(record.timestamp) }))
    .filter((item): item is { record: ExactCdxRecord; observedAt: Date } => item.observedAt !== null)
    .filter((item) => item.observedAt.getTime() >= cutoff && item.observedAt.getTime() <= futureCeiling)
    .sort((a, b) => b.observedAt.getTime() - a.observedAt.getTime());
  const allExactDates = exact
    .map((record) => parseCommonCrawlTimestamp(record.timestamp))
    .filter((date): date is Date => date !== null)
    .sort((a, b) => b.getTime() - a.getTime());

  let reason: ExactCdxClassification["reason"] = "stale_only";
  if (exact.length === 0) reason = "no_exact_record";
  else if (html200.length === 0) reason = "no_200_html";
  else if (recent.length > 0) reason = "recent_exact_200_html";

  return {
    eligible: recent.length > 0,
    exact_records: exact.length,
    exact_200_html_records: html200.length,
    recent_exact_200_html_records: recent.length,
    latest_exact_observed_at: allExactDates[0]?.toISOString() ?? null,
    latest_eligible_observed_at: recent[0]?.observedAt.toISOString() ?? null,
    reason,
  };
}

function cdxIndexSortKey(index: string): number {
  const match = /^CC-MAIN-(\d{4})-(\d{2})$/.exec(index);
  return match ? Number(match[1]) * 100 + Number(match[2]) : -1;
}

export async function resolveLatestCdxIndexes(fetchImpl: typeof fetch = fetch): Promise<{ indexes: string[]; source: "collinfo" | "fallback" }> {
  try {
    const response = await fetchImpl(COMMON_CRAWL_COLLINFO_URL, {
      headers: { "User-Agent": COMMON_CRAWL_USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload)) throw new Error("invalid collinfo payload");
    const indexes = [...new Set(payload
      .map((item) => item && typeof item === "object" && "id" in item ? String((item as { id?: unknown }).id ?? "") : "")
      .filter((id) => /^CC-MAIN-\d{4}-\d{2}$/.test(id)))]
      .sort((a, b) => cdxIndexSortKey(b) - cdxIndexSortKey(a))
      .slice(0, 3);
    if (indexes.length === 0) throw new Error("no valid indexes");
    return { indexes, source: "collinfo" };
  } catch {
    return { indexes: [...EXACT_CDX_FALLBACK_INDEXES], source: "fallback" };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchExactCdxRecords(
  canonicalUrl: string,
  index: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ExactCdxRecord[]> {
  const url = buildExactCdxIndexUrl(canonicalUrl, index);
  let lastError = "unknown";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers: { "User-Agent": COMMON_CRAWL_USER_AGENT, Accept: "application/json,text/plain;q=0.9,*/*;q=0.1" },
        signal: AbortSignal.timeout(20_000),
      });
      if (response.status === 404) return [];
      if (response.ok) {
        const text = await response.text();
        return text.split("\n").map((line) => parseExactCdxJsonLine(line, index)).filter((record): record is ExactCdxRecord => record !== null);
      }
      lastError = `HTTP ${response.status}`;
      if (!RETRYABLE.has(response.status) || attempt === 3) break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt === 3) break;
    }
    await sleep(500 * attempt);
  }
  throw new Error(`exact CDX query failed ${index}: ${lastError}`);
}
