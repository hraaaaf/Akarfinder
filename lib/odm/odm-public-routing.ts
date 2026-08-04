import { createHash } from "node:crypto";

import {
  mapOdmPageToSearchResult,
  readPublicCanaryPercent,
  shouldServeOdmPublicCanary,
} from "@/lib/odm/odm-public-canary";
import { searchListings, type SearchQuery, type SearchResult } from "@/lib/search";
import {
  searchPublicRepresentations,
  type PublicSearchInput,
  type PublicSearchPage,
} from "@/lib/search-gateway/public-search-cursor";

export type OdmPublicSearchSurface = "api_search" | "search_page";
export type OdmPublicSearchLane = "odm" | "legacy_primary" | "legacy_fallback";
export type OdmPublicSearchFailureStage = "odm" | "legacy_primary" | "legacy_fallback";

export type OdmPublicRoutingMetric = {
  version: "odm_public_routing_v1";
  event: "route_completed" | "route_failed";
  surface: OdmPublicSearchSurface;
  lane: OdmPublicSearchLane | null;
  failure_stage: OdmPublicSearchFailureStage | null;
  stable_key_hash: string;
  configured_percent: number;
  full_cutover_configured: boolean;
  enabled: boolean;
  approved: boolean;
  emergency_stop: boolean;
  duration_ms: number;
  result_count: number | null;
  total_count: number | null;
  has_more: boolean | null;
  result_source: SearchResult["source"] | null;
  error_name: string | null;
};

export type OdmPublicRoutingResult = {
  result: SearchResult;
  lane: OdmPublicSearchLane;
};

export type OdmPublicRoutingDependencies = {
  env: NodeJS.ProcessEnv;
  now: () => number;
  searchOdm: (input: PublicSearchInput) => Promise<PublicSearchPage>;
  searchLegacy: (query: SearchQuery) => Promise<SearchResult>;
  logInfo: (metric: OdmPublicRoutingMetric) => void;
  logWarn: (metric: OdmPublicRoutingMetric) => void;
};

const defaultDependencies: OdmPublicRoutingDependencies = {
  env: process.env,
  now: Date.now,
  searchOdm: searchPublicRepresentations,
  searchLegacy: searchListings,
  logInfo(metric) {
    console.info("[odm-public-routing]", JSON.stringify(metric));
  },
  logWarn(metric) {
    console.warn("[odm-public-routing]", JSON.stringify(metric));
  },
};

function explicitTrue(value: string | undefined): boolean {
  return value === "true";
}

function stableKeyHash(stableKey: string): string {
  return createHash("sha256").update(stableKey).digest("hex").slice(0, 16);
}

function errorName(error: unknown): string {
  return error instanceof Error && error.name ? error.name : "UnknownError";
}

function routingState(env: NodeJS.ProcessEnv) {
  const configuredPercent = readPublicCanaryPercent(env);
  return {
    configured_percent: configuredPercent,
    full_cutover_configured: configuredPercent === 100,
    enabled: explicitTrue(env.ODM_PUBLIC_CANARY_ENABLED),
    approved: explicitTrue(env.ODM_PUBLIC_CANARY_APPROVED),
    emergency_stop: explicitTrue(env.ODM_PUBLIC_CANARY_STOP),
  };
}

function completionMetric(input: {
  surface: OdmPublicSearchSurface;
  lane: OdmPublicSearchLane;
  stableKey: string;
  env: NodeJS.ProcessEnv;
  durationMs: number;
  result: SearchResult;
}): OdmPublicRoutingMetric {
  return {
    version: "odm_public_routing_v1",
    event: "route_completed",
    surface: input.surface,
    lane: input.lane,
    failure_stage: null,
    stable_key_hash: stableKeyHash(input.stableKey),
    ...routingState(input.env),
    duration_ms: Math.max(0, input.durationMs),
    result_count: input.result.listings.length,
    total_count: input.result.total,
    has_more: input.result.has_more ?? null,
    result_source: input.result.source,
    error_name: null,
  };
}

function failureMetric(input: {
  surface: OdmPublicSearchSurface;
  stage: OdmPublicSearchFailureStage;
  stableKey: string;
  env: NodeJS.ProcessEnv;
  durationMs: number;
  error: unknown;
}): OdmPublicRoutingMetric {
  return {
    version: "odm_public_routing_v1",
    event: "route_failed",
    surface: input.surface,
    lane: null,
    failure_stage: input.stage,
    stable_key_hash: stableKeyHash(input.stableKey),
    ...routingState(input.env),
    duration_ms: Math.max(0, input.durationMs),
    result_count: null,
    total_count: null,
    has_more: null,
    result_source: null,
    error_name: errorName(input.error),
  };
}

export function buildOdmPublicSearchInput(query: SearchQuery): PublicSearchInput {
  return {
    q: query.q,
    city: query.city,
    propertyType: query.property_type,
    intent: query.transaction_type,
    minPrice: query.min_price,
    maxPrice: query.max_price,
    minSurface: query.min_surface,
    maxSurface: query.max_surface,
    limit: Math.min(query.limit ?? 50, 100),
  };
}

export async function routePublicSearch(
  input: {
    stableKey: string;
    publicQuery: SearchQuery;
    legacyQuery?: SearchQuery;
    surface: OdmPublicSearchSurface;
  },
  overrides: Partial<OdmPublicRoutingDependencies> = {},
): Promise<OdmPublicRoutingResult> {
  const dependencies: OdmPublicRoutingDependencies = {
    ...defaultDependencies,
    ...overrides,
  };
  const startedAt = dependencies.now();
  const legacyQuery = input.legacyQuery ?? input.publicQuery;

  if (shouldServeOdmPublicCanary(input.stableKey, dependencies.env)) {
    try {
      const page = await dependencies.searchOdm(buildOdmPublicSearchInput(input.publicQuery));
      const result = mapOdmPageToSearchResult(page, input.publicQuery);
      dependencies.logInfo(completionMetric({
        surface: input.surface,
        lane: "odm",
        stableKey: input.stableKey,
        env: dependencies.env,
        durationMs: dependencies.now() - startedAt,
        result,
      }));
      return { result, lane: "odm" };
    } catch (error) {
      dependencies.logWarn(failureMetric({
        surface: input.surface,
        stage: "odm",
        stableKey: input.stableKey,
        env: dependencies.env,
        durationMs: dependencies.now() - startedAt,
        error,
      }));

      try {
        const result = await dependencies.searchLegacy(legacyQuery);
        dependencies.logWarn(completionMetric({
          surface: input.surface,
          lane: "legacy_fallback",
          stableKey: input.stableKey,
          env: dependencies.env,
          durationMs: dependencies.now() - startedAt,
          result,
        }));
        return { result, lane: "legacy_fallback" };
      } catch (legacyError) {
        dependencies.logWarn(failureMetric({
          surface: input.surface,
          stage: "legacy_fallback",
          stableKey: input.stableKey,
          env: dependencies.env,
          durationMs: dependencies.now() - startedAt,
          error: legacyError,
        }));
        throw legacyError;
      }
    }
  }

  try {
    const result = await dependencies.searchLegacy(legacyQuery);
    dependencies.logInfo(completionMetric({
      surface: input.surface,
      lane: "legacy_primary",
      stableKey: input.stableKey,
      env: dependencies.env,
      durationMs: dependencies.now() - startedAt,
      result,
    }));
    return { result, lane: "legacy_primary" };
  } catch (error) {
    dependencies.logWarn(failureMetric({
      surface: input.surface,
      stage: "legacy_primary",
      stableKey: input.stableKey,
      env: dependencies.env,
      durationMs: dependencies.now() - startedAt,
      error,
    }));
    throw error;
  }
}
