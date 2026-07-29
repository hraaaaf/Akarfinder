export type GeometryCanaryConfig = {
  enabled: boolean;
  approved: boolean;
  emergencyStop: boolean;
  percent: number;
  deploymentEnvironment: string;
};

export type GeometryCanaryDecision = {
  eligible: boolean;
  bucket: number;
  percent: number;
  reason:
    | "eligible"
    | "disabled"
    | "not_approved"
    | "emergency_stop"
    | "production_blocked"
    | "invalid_percent"
    | "outside_sample";
};

export const MAX_GEOMETRY_CANARY_PERCENT = 1;
export const CASABLANCA_GEOMETRY_CANARY_APPROVAL_ID = "casablanca_geometry_preview_canary_v1_approved_2026_07_29";

function hashStableKey(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function geometryCanaryBucket(stableKey: string): number {
  return hashStableKey(stableKey || "anonymous") % 10_000;
}

export function decideCasablancaGeometryCanary(
  config: GeometryCanaryConfig,
  stableKey: string,
): GeometryCanaryDecision {
  const bucket = geometryCanaryBucket(stableKey);
  const percent = config.percent;

  if (!config.enabled) return { eligible: false, bucket, percent, reason: "disabled" };
  if (!config.approved) return { eligible: false, bucket, percent, reason: "not_approved" };
  if (config.emergencyStop) return { eligible: false, bucket, percent, reason: "emergency_stop" };
  if (config.deploymentEnvironment === "production") {
    return { eligible: false, bucket, percent, reason: "production_blocked" };
  }
  if (!Number.isFinite(percent) || percent <= 0 || percent > MAX_GEOMETRY_CANARY_PERCENT) {
    return { eligible: false, bucket, percent, reason: "invalid_percent" };
  }

  const threshold = Math.floor(percent * 100);
  if (bucket >= threshold) return { eligible: false, bucket, percent, reason: "outside_sample" };
  return { eligible: true, bucket, percent, reason: "eligible" };
}

export function readCasablancaGeometryCanaryConfig(
  environment: NodeJS.ProcessEnv = process.env,
): GeometryCanaryConfig {
  const deploymentEnvironment = environment.VERCEL_ENV ?? environment.NODE_ENV ?? "unknown";
  const isPreview = deploymentEnvironment === "preview";

  return {
    enabled: isPreview && environment.NEIGHBORHOOD_GEOMETRY_CANARY_ENABLED !== "false",
    approved: isPreview && CASABLANCA_GEOMETRY_CANARY_APPROVAL_ID.length > 0,
    emergencyStop: environment.NEIGHBORHOOD_GEOMETRY_CANARY_STOP === "true",
    percent: isPreview ? Number(environment.NEIGHBORHOOD_GEOMETRY_CANARY_PERCENT ?? "1") : 0,
    deploymentEnvironment,
  };
}
