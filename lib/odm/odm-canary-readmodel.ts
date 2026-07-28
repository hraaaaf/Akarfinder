// ODM-CANARY-READMODEL-01 — preparation-only, fail-closed canary controller.
// This module is intentionally not imported by any public route.

export const ODM_CANARY_FLAG_NAMES = [
  "ODM_CANARY_READMODEL_ENABLED",
  "ODM_CANARY_READMODEL_PERCENT",
] as const;

export const ODM_CANARY_MAX_PERCENT = 1;

export type CanaryStopMetrics = {
  sampleSize: number;
  errorRate: number;
  canonicalLinkDivergenceRate: number;
  trustedPriceDivergenceRate: number;
  trustedSurfaceDivergenceRate: number;
  suppressedFieldRate: number;
  unresolvedSourcePolicyRate: number;
};

export type CanaryThresholds = {
  minimumSampleSize: number;
  maximumErrorRate: number;
  maximumCanonicalLinkDivergenceRate: number;
  maximumTrustedPriceDivergenceRate: number;
  maximumTrustedSurfaceDivergenceRate: number;
  maximumSuppressedFieldRate: number;
  maximumUnresolvedSourcePolicyRate: number;
};

export const ODM_CANARY_THRESHOLDS_V1: CanaryThresholds = {
  minimumSampleSize: 200,
  maximumErrorRate: 0.005,
  maximumCanonicalLinkDivergenceRate: 0.01,
  maximumTrustedPriceDivergenceRate: 0.02,
  maximumTrustedSurfaceDivergenceRate: 0.03,
  maximumSuppressedFieldRate: 0.15,
  maximumUnresolvedSourcePolicyRate: 0.05,
};

function explicitTrue(value: string | undefined): boolean {
  return value === "true";
}

export function readCanaryPercent(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.ODM_CANARY_READMODEL_PERCENT;
  if (raw === undefined || raw.trim() === "") return 0;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > ODM_CANARY_MAX_PERCENT) return 0;
  return parsed;
}

export function isOdmCanaryConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return explicitTrue(env.ODM_CANARY_READMODEL_ENABLED) && readCanaryPercent(env) > 0;
}

// FNV-1a, converted into one of 10,000 stable basis-point buckets.
export function stableCanaryBucket(key: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % 10_000;
}

export function shouldEnterOdmCanary(
  stableKey: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!stableKey || !isOdmCanaryConfigured(env)) return false;
  const percent = readCanaryPercent(env);
  return stableCanaryBucket(stableKey) < Math.floor(percent * 100);
}

export type StopGateResult = {
  stop: boolean;
  reasons: string[];
};

export function evaluateCanaryStopGate(
  metrics: CanaryStopMetrics,
  thresholds: CanaryThresholds = ODM_CANARY_THRESHOLDS_V1,
): StopGateResult {
  const reasons: string[] = [];

  if (metrics.sampleSize < thresholds.minimumSampleSize) reasons.push("insufficient_sample");
  if (metrics.errorRate > thresholds.maximumErrorRate) reasons.push("error_rate_exceeded");
  if (metrics.canonicalLinkDivergenceRate > thresholds.maximumCanonicalLinkDivergenceRate) {
    reasons.push("canonical_link_divergence_exceeded");
  }
  if (metrics.trustedPriceDivergenceRate > thresholds.maximumTrustedPriceDivergenceRate) {
    reasons.push("trusted_price_divergence_exceeded");
  }
  if (metrics.trustedSurfaceDivergenceRate > thresholds.maximumTrustedSurfaceDivergenceRate) {
    reasons.push("trusted_surface_divergence_exceeded");
  }
  if (metrics.suppressedFieldRate > thresholds.maximumSuppressedFieldRate) {
    reasons.push("suppressed_field_rate_exceeded");
  }
  if (metrics.unresolvedSourcePolicyRate > thresholds.maximumUnresolvedSourcePolicyRate) {
    reasons.push("unresolved_source_policy_rate_exceeded");
  }

  return { stop: reasons.length > 0, reasons };
}

export function canServeOdmReadModel(
  stableKey: string | null | undefined,
  metrics: CanaryStopMetrics,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!shouldEnterOdmCanary(stableKey, env)) return false;
  return !evaluateCanaryStopGate(metrics).stop;
}
