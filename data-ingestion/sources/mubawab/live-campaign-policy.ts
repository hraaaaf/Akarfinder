export type LiveCampaignPolicy = {
  pageWindow: number;
  maxWaves: number;
  maxPartitionsPerWave: number;
  requestDelayMs: number;
  theoreticalMaxPageRequests: number;
};

const PAGE_WINDOW = 3;
const DEFAULT_MAX_WAVES = 2;
const DEFAULT_MAX_PARTITIONS_PER_WAVE = 3;
const DEFAULT_REQUEST_DELAY_MS = 1500;
const MAX_THEORETICAL_PAGE_REQUESTS = 300;

function boundedInteger(
  raw: string | undefined,
  fallback: number,
  field: string,
  min: number,
  max: number,
): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`lot9_live_policy_invalid_${field}:${raw}`);
  }
  return value;
}

export function resolveLiveCampaignPolicy(
  env: Record<string, string | undefined> = process.env,
): LiveCampaignPolicy {
  const maxWaves = boundedInteger(env.LOT9_MAX_WAVES, DEFAULT_MAX_WAVES, "max_waves", 1, 20);
  const maxPartitionsPerWave = boundedInteger(
    env.LOT9_MAX_PARTITIONS_PER_WAVE,
    DEFAULT_MAX_PARTITIONS_PER_WAVE,
    "max_partitions_per_wave",
    1,
    20,
  );
  const requestDelayMs = boundedInteger(
    env.LOT9_REQUEST_DELAY_MS,
    DEFAULT_REQUEST_DELAY_MS,
    "request_delay_ms",
    DEFAULT_REQUEST_DELAY_MS,
    10_000,
  );
  const theoreticalMaxPageRequests = maxWaves * maxPartitionsPerWave * PAGE_WINDOW;
  if (theoreticalMaxPageRequests > MAX_THEORETICAL_PAGE_REQUESTS) {
    throw new Error(`lot9_live_policy_request_cap_exceeded:${theoreticalMaxPageRequests}:${MAX_THEORETICAL_PAGE_REQUESTS}`);
  }

  return {
    pageWindow: PAGE_WINDOW,
    maxWaves,
    maxPartitionsPerWave,
    requestDelayMs,
    theoreticalMaxPageRequests,
  };
}

export const LOT9_LIVE_POLICY_LIMITS = {
  page_window: PAGE_WINDOW,
  minimum_request_delay_ms: DEFAULT_REQUEST_DELAY_MS,
  maximum_theoretical_page_requests: MAX_THEORETICAL_PAGE_REQUESTS,
} as const;
