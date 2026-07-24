import { getResidualSearchText } from "./query-intent";
import type { SearchQuery, TypesenseListingDocument } from "./types";

type TypesenseConfig = {
  host: string;
  port: string;
  protocol: string;
  apiKey: string;
  collection: string;
};

type TypesenseSearchHit = {
  document: TypesenseListingDocument;
};

type TypesenseSearchResponse = {
  found?: number;
  hits?: TypesenseSearchHit[];
};

type TypesenseSearchParams = SearchQuery & {
  limit: number;
  offset: number;
};

function getTypesenseConfig(): TypesenseConfig | null {
  const {
    TYPESENSE_HOST,
    TYPESENSE_PORT,
    TYPESENSE_PROTOCOL,
    TYPESENSE_API_KEY,
    TYPESENSE_COLLECTION,
  } = process.env;

  if (
    !TYPESENSE_HOST ||
    !TYPESENSE_PORT ||
    !TYPESENSE_PROTOCOL ||
    !TYPESENSE_API_KEY ||
    !TYPESENSE_COLLECTION
  ) {
    return null;
  }

  return {
    host: TYPESENSE_HOST,
    port: TYPESENSE_PORT,
    protocol: TYPESENSE_PROTOCOL,
    apiKey: TYPESENSE_API_KEY,
    collection: TYPESENSE_COLLECTION,
  };
}

function getBaseUrl(config: TypesenseConfig) {
  return `${config.protocol}://${config.host}:${config.port}`;
}

async function requestTypesense<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const config = getTypesenseConfig();
  if (!config) throw new Error("Typesense is not configured");

  const response = await fetch(`${getBaseUrl(config)}${path}`, {
    ...init,
    headers: {
      "X-TYPESENSE-API-KEY": config.apiKey,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Typesense request failed (${response.status}): ${detail}`);
  }

  return (await response.json()) as T;
}

export function getTypesenseCollectionName(): string {
  const config = getTypesenseConfig();
  if (!config) throw new Error("Typesense is not configured");
  return config.collection;
}

export async function ensureTypesenseCollection() {
  const collection = getTypesenseCollectionName();

  try {
    await requestTypesense(`/collections/${encodeURIComponent(collection)}`);
    return;
  } catch {
    // Collection lookup can fail when the collection is absent; creation below is idempotent enough for P9A.
  }

  await requestTypesense("/collections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: collection,
      fields: [
        { name: "title", type: "string" },
        { name: "city", type: "string", facet: true },
        { name: "district", type: "string", facet: true },
        { name: "property_type", type: "string", facet: true },
        { name: "transaction_type", type: "string", facet: true },
        { name: "price_mad", type: "int32", optional: true },
        { name: "surface_m2", type: "int32", optional: true },
        { name: "bedrooms_count", type: "int32", optional: true },
        { name: "bathrooms_count", type: "int32", optional: true },
        { name: "reliability_score", type: "int32", optional: true },
        { name: "reliability_badge", type: "string", facet: true, optional: true },
        { name: "data_completeness_score", type: "int32", optional: true },
        { name: "duplicate_score", type: "float", optional: true },
        { name: "source_site", type: "string", facet: true, optional: true },
        { name: "built_surface_m2", type: "int32", optional: true },
        { name: "plot_surface_m2", type: "int32", optional: true },
        { name: "condition", type: "string", facet: true, optional: true },
        { name: "property_age_range", type: "string", facet: true, optional: true },
        { name: "garden_m2", type: "int32", optional: true },
        { name: "terrace_m2", type: "int32", optional: true },
        { name: "garage_spaces", type: "int32", optional: true },
        { name: "has_pool", type: "bool", facet: true },
        { name: "has_concierge", type: "bool", facet: true },
        { name: "has_equipped_kitchen", type: "bool", facet: true },
        { name: "premium_features", type: "string[]", facet: true, optional: true },
      ],
      default_sorting_field: "reliability_score",
    }),
  });
}

export async function importTypesenseDocuments(
  documents: TypesenseListingDocument[]
): Promise<{ indexed: number; failed: number; errors: string[] }> {
  const config = getTypesenseConfig();
  if (!config) throw new Error("Typesense is not configured");
  const collection = getTypesenseCollectionName();
  const response = await fetch(
    `${getBaseUrl(config)}/collections/${encodeURIComponent(collection)}/documents/import?action=upsert`,
    {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "X-TYPESENSE-API-KEY": config.apiKey,
      },
      body: documents.map((document) => JSON.stringify(document)).join("\n"),
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Typesense import failed (${response.status}): ${detail}`);
  }

  const text = await response.text();
  const result = text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { success: boolean; error?: string });

  const failedRows = result.filter((row) => !row.success);
  return {
    indexed: result.length - failedRows.length,
    failed: failedRows.length,
    errors: failedRows.map((row) => row.error ?? "Unknown Typesense import error"),
  };
}

/**
 * Build provider-native parameters while preserving the canonical Search doctrine:
 * 1) residual relevance first,
 * 2) disclosed price before the internal 0 sentinel,
 * 3) information completeness.
 *
 * Structured city/type/transaction terms are removed from q because they are
 * already represented as exact filters and must not receive a second relevance boost.
 */
export function buildTypesenseSearchParams(params: TypesenseSearchParams): URLSearchParams {
  const residualText = getResidualSearchText(params);
  const searchParams = new URLSearchParams({
    q: residualText || "*",
    query_by: "title,city,district,property_type,source_site,premium_features",
    per_page: String(params.limit),
    page: String(Math.floor(params.offset / params.limit) + 1),
  });

  const filters: string[] = [];
  if (params.city) filters.push(`city:=${params.city}`);
  if (params.property_type) filters.push(`property_type:=${params.property_type}`);
  if (params.transaction_type) filters.push(`transaction_type:=${params.transaction_type}`);
  if (params.reliability_badge) filters.push(`reliability_badge:=${params.reliability_badge}`);
  if (params.minReliabilityScore != null) {
    filters.push(`reliability_score:>=${params.minReliabilityScore}`);
  }
  if (filters.length > 0) searchParams.set("filter_by", filters.join(" && "));

  if (params.sort === "price_asc") {
    searchParams.set("sort_by", "_eval(price_mad:>0):desc,price_mad:asc");
  } else if (params.sort === "price_desc") {
    searchParams.set("sort_by", "_eval(price_mad:>0):desc,price_mad:desc");
  } else if (params.sort === "surface_desc") {
    searchParams.set("sort_by", "surface_m2:desc");
  } else {
    searchParams.set(
      "sort_by",
      "_text_match:desc,_eval(price_mad:>0):desc,data_completeness_score:desc",
    );
  }

  return searchParams;
}

export async function searchTypesenseDocuments(
  params: TypesenseSearchParams
): Promise<{ documents: TypesenseListingDocument[]; total: number }> {
  const collection = getTypesenseCollectionName();
  const searchParams = buildTypesenseSearchParams(params);

  const response = await requestTypesense<TypesenseSearchResponse>(
    `/collections/${encodeURIComponent(collection)}/documents/search?${searchParams.toString()}`
  );

  return {
    documents: (response.hits ?? []).map((hit) => hit.document),
    total: response.found ?? 0,
  };
}
