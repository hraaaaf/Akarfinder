import { Buffer } from "node:buffer";
import { createHash, timingSafeEqual } from "node:crypto";

import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { diversifySearchGatewayResults } from "@/lib/search-gateway/search-gateway-diversify";
import { mapSeedToThinIndexResult } from "@/lib/search-gateway/seed-thin-index";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";

const CURSOR_VERSION = 2 as const;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;

type PublicSearchCursorPayload = {
  v: typeof CURSOR_VERSION;
  lane: number;
  rank: number;
  updatedAt: string;
  representationId: string;
};

export type PublicSearchInput = {
  q?: string;
  city?: string;
  propertyType?: string;
  intent?: string;
  minPrice?: number;
  maxPrice?: number;
  minSurface?: number;
  maxSurface?: number;
  limit?: number;
  cursor?: string;
};

export type PublicSearchPage = {
  results: SearchGatewayNormalizedResult[];
  results_count: number;
  total_count: number;
  has_more: boolean;
  next_cursor: string | null;
};

type PublicSearchRpcRow = {
  representation_id: string;
  canonical_url: string;
  source_domain: string;
  seed_provider: string;
  freshness_status: string;
  title: string | null;
  snippet: string | null;
  normalized_city: string | null;
  normalized_property_type: string | null;
  normalized_intent: string | null;
  normalized_price_mad: number | null;
  normalized_surface_m2: number | null;
  price_per_m2_mad: number | null;
  quality_tier: string | null;
  quality_score: number | null;
  display_eligibility: string;
  display_eligibility_reason: string | null;
  ranking_quality_boost: number | null;
  updated_at: string;
  lane_weight: number;
  ranking_score: number;
  total_count: number;
};

function cursorSecret(): string {
  return process.env.SEARCH_CURSOR_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function signature(payload: string): string {
  const secret = cursorSecret();
  if (!secret) throw new Error("search_cursor_secret_missing");
  return createHash("sha256").update(`${secret}:${payload}`).digest("base64url");
}

export function encodePublicSearchCursor(payload: PublicSearchCursorPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${signature(body)}`;
}

export function decodePublicSearchCursor(cursor?: string): PublicSearchCursorPayload | null {
  if (!cursor) return null;
  const [body, suppliedSignature, extra] = cursor.split(".");
  if (!body || !suppliedSignature || extra) throw new Error("invalid_search_cursor");

  const expectedSignature = signature(body);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new Error("invalid_search_cursor_signature");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw new Error("invalid_search_cursor_payload");
  }

  if (!parsed || typeof parsed !== "object") throw new Error("invalid_search_cursor_payload");
  const value = parsed as Partial<PublicSearchCursorPayload>;
  if (
    value.v !== CURSOR_VERSION ||
    !Number.isInteger(value.lane) ||
    typeof value.rank !== "number" ||
    !Number.isFinite(value.rank) ||
    typeof value.updatedAt !== "string" ||
    Number.isNaN(Date.parse(value.updatedAt)) ||
    typeof value.representationId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(value.representationId)
  ) {
    throw new Error("invalid_search_cursor_payload");
  }
  return value as PublicSearchCursorPayload;
}

function boundedOptionalNumber(value?: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function toSeedRow(row: PublicSearchRpcRow) {
  return {
    id: row.representation_id,
    seed_id: row.representation_id,
    canonical_url: row.canonical_url,
    source_domain: row.source_domain,
    seed_provider: row.seed_provider,
    freshness_status: row.freshness_status,
    updated_at: row.updated_at,
    relevance_rank: row.ranking_score,
    quality_tier: row.quality_tier,
    display_eligibility: row.display_eligibility,
    ranking_quality_boost: row.ranking_quality_boost,
    normalized_city: row.normalized_city,
    normalized_property_type: row.normalized_property_type,
    normalized_intent: row.normalized_intent,
    normalized_price_mad: row.normalized_price_mad,
    normalized_surface_m2: row.normalized_surface_m2,
    price_per_m2_mad: row.price_per_m2_mad,
    quality_score: row.quality_score,
    display_eligibility_reason: row.display_eligibility_reason,
    metadata: row.seed_provider === "serper_search"
      ? { serper_search: { title: row.title, snippet: row.snippet } }
      : null,
  };
}

function mapAndDiversifyWithinBusinessLanes(rows: PublicSearchRpcRow[]): SearchGatewayNormalizedResult[] {
  const laneOrder = [...new Set(rows.map((row) => row.lane_weight))].sort((a, b) => a - b);
  const diversified: SearchGatewayNormalizedResult[] = [];

  for (const lane of laneOrder) {
    const laneResults = rows
      .filter((row) => row.lane_weight === lane)
      .map((row) => mapSeedToThinIndexResult(toSeedRow(row) as never));
    diversified.push(...diversifySearchGatewayResults(laneResults, 1));
  }

  return diversified;
}

export async function searchPublicRepresentations(input: PublicSearchInput): Promise<PublicSearchPage> {
  const cursor = decodePublicSearchCursor(input.cursor);
  const pageSize = Math.max(1, Math.min(Math.trunc(input.limit ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE));
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("search_public_representations_v2", {
    p_query: input.q?.trim() || null,
    p_city: input.city?.trim() || null,
    p_property_type: input.propertyType?.trim() || null,
    p_intent: input.intent?.trim() || null,
    p_min_price: boundedOptionalNumber(input.minPrice),
    p_max_price: boundedOptionalNumber(input.maxPrice),
    p_min_surface: boundedOptionalNumber(input.minSurface),
    p_max_surface: boundedOptionalNumber(input.maxSurface),
    p_limit: pageSize + 1,
    p_after_lane: cursor?.lane ?? null,
    p_after_rank: cursor?.rank ?? null,
    p_after_updated_at: cursor?.updatedAt ?? null,
    p_after_representation_id: cursor?.representationId ?? null,
  });
  if (error) throw new Error(`public_search_rpc_v2_failed:${error.message}`);

  const rows = (data ?? []) as PublicSearchRpcRow[];
  const hasMore = rows.length > pageSize;
  const pageRows = rows.slice(0, pageSize);
  const tail = pageRows.at(-1);
  return {
    results: mapAndDiversifyWithinBusinessLanes(pageRows),
    results_count: pageRows.length,
    total_count: Number(pageRows[0]?.total_count ?? 0),
    has_more: hasMore,
    next_cursor: hasMore && tail
      ? encodePublicSearchCursor({
          v: CURSOR_VERSION,
          lane: tail.lane_weight,
          rank: tail.ranking_score,
          updatedAt: tail.updated_at,
          representationId: tail.representation_id,
        })
      : null,
  };
}
