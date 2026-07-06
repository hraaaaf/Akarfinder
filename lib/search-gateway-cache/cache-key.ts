import { analyzeGatewayQueryContext } from "@/lib/search-gateway/search-gateway-relevance-tuning";
import {
  SEARCH_GATEWAY_CACHE_PROVIDER,
  SEARCH_GATEWAY_CACHE_VERSION,
  type SearchGatewayCacheContext,
} from "./types";

function normalizeText(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\b[\w.+-]+@[\w.-]+\.\w+\b/g, " ")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string | undefined, fallback: string): string {
  const normalized = normalizeText(value)
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || fallback;
}

export function buildSearchGatewayCacheContext(input: SearchGatewayCacheContext): SearchGatewayCacheContext {
  const analysis = analyzeGatewayQueryContext({
    q: input.query,
    city: input.city,
    property_type: input.property_type,
    intent: input.transaction_type,
  });

  return {
    provider: input.provider || SEARCH_GATEWAY_CACHE_PROVIDER,
    query: analysis.normalized_query || normalizeText(input.query),
    city: analysis.city || normalizeText(input.city),
    property_type: analysis.property_type || normalizeText(input.property_type),
    transaction_type: analysis.intent || normalizeText(input.transaction_type),
    page: Number.isFinite(input.page) && (input.page ?? 1) > 0 ? input.page : 1,
    locale: normalizeText(input.locale || "fr-MA") || "fr-ma",
  };
}

export function buildSearchGatewayCacheKey(input: SearchGatewayCacheContext): string {
  const context = buildSearchGatewayCacheContext(input);
  const queryPart =
    slugify(
      context.query,
      [context.property_type, context.city].filter(Boolean).join("-") || "browse",
    );

  return [
    context.provider || SEARCH_GATEWAY_CACHE_PROVIDER,
    SEARCH_GATEWAY_CACHE_VERSION,
    slugify(context.transaction_type, "all"),
    slugify(context.property_type, "all"),
    slugify(context.city, "all"),
    `page${context.page ?? 1}`,
    slugify(context.locale, "fr-ma"),
    queryPart,
  ].join(":");
}

export function buildSearchGatewayRequestHash(input: SearchGatewayCacheContext): string {
  const context = buildSearchGatewayCacheContext(input);
  const payload = JSON.stringify(context);
  let hash = 0;
  for (let i = 0; i < payload.length; i += 1) {
    hash = (hash << 5) - hash + payload.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}
