import type { GeoProviderKind } from "@/lib/geo/provider-contracts";

export const GEO_EPHEMERAL_CACHE_MAX_SECONDS = 24 * 60 * 60;

export type GeoCacheMode = "no_store" | "ephemeral" | "provider_defined";

export type GeoProviderRuntimePolicy = {
  providerId: string;
  kind: GeoProviderKind;
  cacheMode: GeoCacheMode;
  maxCacheSeconds: number | null;
  attributionRequired: boolean;
  persistentStorageAllowed: boolean;
};

export const GEO_PROVIDER_ENV_KEYS: Record<GeoProviderKind, string> = {
  nearby: "AKAR_GEO_NEARBY_PROVIDERS",
  routing: "AKAR_GEO_ROUTING_PROVIDERS",
  isochrone: "AKAR_GEO_ISOCHRONE_PROVIDERS",
  street_imagery: "AKAR_GEO_STREET_IMAGERY_PROVIDERS",
};

export function parseProviderOrder(value: string | undefined): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const raw of value.split(",")) {
    const id = raw.trim().toLowerCase();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  return ordered;
}

export function resolveProviderOrder(
  kind: GeoProviderKind,
  env: Record<string, string | undefined> = process.env,
): string[] {
  return parseProviderOrder(env[GEO_PROVIDER_ENV_KEYS[kind]]);
}

export function validateGeoProviderRuntimePolicy(policy: GeoProviderRuntimePolicy): string[] {
  const errors: string[] = [];
  if (!policy.providerId.trim()) errors.push("provider_id_required");
  if (policy.attributionRequired !== true) errors.push("attribution_must_be_required");
  if (policy.maxCacheSeconds != null && (!Number.isFinite(policy.maxCacheSeconds) || policy.maxCacheSeconds < 0)) {
    errors.push("invalid_cache_ttl");
  }
  if (policy.cacheMode === "no_store" && policy.maxCacheSeconds !== 0) errors.push("no_store_ttl_must_be_zero");
  if (policy.cacheMode === "ephemeral" && (policy.maxCacheSeconds == null || policy.maxCacheSeconds <= 0)) {
    errors.push("ephemeral_ttl_required");
  }
  if (policy.cacheMode === "ephemeral" && policy.maxCacheSeconds != null && policy.maxCacheSeconds > GEO_EPHEMERAL_CACHE_MAX_SECONDS) {
    errors.push("ephemeral_ttl_exceeds_24h");
  }
  if (policy.persistentStorageAllowed && policy.cacheMode !== "provider_defined") {
    errors.push("persistent_storage_requires_provider_defined_policy");
  }
  return errors;
}

export function canPersistProviderPayload(policy: GeoProviderRuntimePolicy): boolean {
  return policy.persistentStorageAllowed &&
    policy.cacheMode === "provider_defined" &&
    validateGeoProviderRuntimePolicy(policy).length === 0;
}
