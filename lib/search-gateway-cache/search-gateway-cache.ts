import type { SearchGatewayRouteResponse } from "@/lib/search-gateway/search-gateway-types";
import { buildSearchGatewayCacheExpiry, getSearchGatewayCachePolicy } from "./cache-policy";
import { buildSearchGatewayCacheContext, buildSearchGatewayCacheKey, buildSearchGatewayRequestHash } from "./cache-key";
import { attachSearchGatewayCacheMetadata, buildStaleGatewayResponse, sanitizeSearchGatewayResponseForCache } from "./public-safety";
import type {
  SearchGatewayCacheContext,
  SearchGatewayCacheEntry,
  SearchGatewayCacheMetadata,
  SearchGatewayCacheStore,
  SearchGatewayProviderIssueClassification,
} from "./types";

export interface SearchGatewayFreshExecution {
  response: SearchGatewayRouteResponse;
  provider_issue_classification?: SearchGatewayProviderIssueClassification;
}

export interface ExecuteSearchGatewayWithCacheInput {
  cacheContext: SearchGatewayCacheContext;
  cacheStore: SearchGatewayCacheStore;
  executeFresh: () => Promise<SearchGatewayFreshExecution>;
  now?: Date;
}

function buildEntry(
  response: SearchGatewayRouteResponse,
  cacheContext: SearchGatewayCacheContext,
  cacheKey: string,
  now: Date,
): SearchGatewayCacheEntry {
  const context = buildSearchGatewayCacheContext(cacheContext);
  const policy = getSearchGatewayCachePolicy(context);
  const { expiresAt, staleUntil } = buildSearchGatewayCacheExpiry(now, policy);

  return {
    cache_key: cacheKey,
    query: context.query || "browse",
    provider: context.provider,
    request_hash: buildSearchGatewayRequestHash(context),
    response_json: sanitizeSearchGatewayResponseForCache(response),
    result_count: response.results_count,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    stale_until: staleUntil.toISOString(),
    last_hit_at: null,
    hit_count: 0,
  };
}

function buildMetadata(
  status: SearchGatewayCacheMetadata["status"],
  ageSeconds: number | undefined,
  providerIssue: SearchGatewayProviderIssueClassification | undefined,
  provider: string,
): SearchGatewayCacheMetadata {
  return {
    status,
    provider,
    age_seconds: ageSeconds,
    provider_issue_classification: providerIssue,
  };
}

export async function executeSearchGatewayWithCache({
  cacheContext,
  cacheStore,
  executeFresh,
  now = new Date(),
}: ExecuteSearchGatewayWithCacheInput): Promise<SearchGatewayRouteResponse> {
  const context = buildSearchGatewayCacheContext(cacheContext);
  const cacheKey = buildSearchGatewayCacheKey(context);

  const freshLookup = await cacheStore.readFresh(cacheKey, now);
  if (freshLookup.status === "hit") {
    void cacheStore.recordHit(freshLookup.entry, now);
    return attachSearchGatewayCacheMetadata(
      freshLookup.entry.response_json,
      buildMetadata("hit", freshLookup.age_seconds, undefined, context.provider),
    );
  }

  const freshExecution = await executeFresh();
  const freshResponse = freshExecution.response;
  const providerIssue = freshExecution.provider_issue_classification;

  if (freshResponse.ok && freshResponse.results_count > 0) {
    const entry = buildEntry(freshResponse, context, cacheKey, now);
    await cacheStore.write(entry);
    return attachSearchGatewayCacheMetadata(
      freshResponse,
      buildMetadata(
        freshLookup.status === "error" ? "error" : freshLookup.status === "bypass" ? "bypass" : "miss",
        undefined,
        providerIssue,
        context.provider,
      ),
    );
  }

  const staleLookup = await cacheStore.readStale(cacheKey, now);
  if (staleLookup.status === "stale") {
    void cacheStore.recordHit(staleLookup.entry, now);
    return attachSearchGatewayCacheMetadata(
      buildStaleGatewayResponse(staleLookup.entry.response_json, providerIssue),
      buildMetadata("stale", staleLookup.age_seconds, providerIssue, context.provider),
    );
  }

  return attachSearchGatewayCacheMetadata(
    freshResponse,
    buildMetadata(
      freshLookup.status === "error" ? "error" : freshLookup.status === "bypass" ? "bypass" : "miss",
      undefined,
      providerIssue,
      context.provider,
    ),
  );
}
