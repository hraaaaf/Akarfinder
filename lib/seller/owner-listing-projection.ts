import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";

export type OwnerListingSearchInput = {
  q?: string;
  city?: string;
  propertyType?: string;
  intent?: string;
  minPrice?: number;
  maxPrice?: number;
  minSurface?: number;
  maxSurface?: number;
  limit?: number;
};

type OwnerSearchRow = {
  representation_id: string;
  title: string;
  snippet: string;
  normalized_city: string | null;
  normalized_property_type: string | null;
  normalized_intent: string | null;
  normalized_price_mad: number | null;
  normalized_surface_m2: number | null;
  price_per_m2_mad: number | null;
  quality_tier: string;
  quality_score: number;
  display_eligibility: string;
  display_eligibility_reason: string | null;
  ranking_quality_boost: number;
  updated_at: string;
  total_count: number;
};

function bounded(value?: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function ownerListingsSearchEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.OWNER_LISTINGS_PUBLIC_SEARCH_ENABLED === "true";
}

export async function syncOwnerListingProjection(draftId: string): Promise<string | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("sync_owner_listing_representation_v1", { p_draft_id: draftId });
  if (error) throw new Error(`owner_listing_projection_failed:${error.message}`);
  return typeof data === "string" ? data : null;
}

export async function searchOwnerListings(input: OwnerListingSearchInput): Promise<{
  results: SearchGatewayNormalizedResult[];
  totalCount: number;
}> {
  if (!ownerListingsSearchEnabled()) return { results: [], totalCount: 0 };

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("search_owner_public_representations_v1", {
    p_query: input.q?.trim() || null,
    p_city: input.city?.trim() || null,
    p_property_type: input.propertyType?.trim() || null,
    p_intent: input.intent?.trim() || null,
    p_min_price: bounded(input.minPrice),
    p_max_price: bounded(input.maxPrice),
    p_min_surface: bounded(input.minSurface),
    p_max_surface: bounded(input.maxSurface),
    p_limit: Math.max(1, Math.min(Math.trunc(input.limit ?? 20), 50)),
  });
  if (error) throw new Error(`owner_listing_search_failed:${error.message}`);

  const rows = (data ?? []) as OwnerSearchRow[];
  return {
    totalCount: Number(rows[0]?.total_count ?? 0),
    results: rows.map((row) => ({
      id: `owner_${row.representation_id}`,
      title: row.title,
      snippet: row.snippet,
      original_url: `/listings/owner-${row.representation_id}`,
      display_url: `akarfinder.ma/listings/owner-${row.representation_id}`,
      source_id: "owner_declared",
      source_name: "Propriétaire",
      domain: "akarfinder.ma",
      result_origin: "public_sitemap",
      search_result_display_mode: "owner_verified_listing",
      source_badge: "owner_published",
      production_allowed: true,
      can_show_result: true,
      can_show_thumbnail: false,
      can_show_contact: false,
      can_show_gallery: false,
      can_cache_thumbnail: false,
      can_download_thumbnail: false,
      primary_cta: "view_original",
      primary_cta_label: "Voir l’annonce",
      result_attribution_label: "Annonce publiée par son propriétaire",
      thumbnail_risk_accepted: false,
      normalized_city: row.normalized_city ?? undefined,
      normalized_property_type: row.normalized_property_type ?? undefined,
      normalized_intent: row.normalized_intent ?? undefined,
      normalized_price_mad: row.normalized_price_mad ?? undefined,
      normalized_surface_m2: row.normalized_surface_m2 ?? undefined,
      price_per_m2_mad: row.price_per_m2_mad ?? undefined,
      quality_tier: row.quality_tier,
      quality_score: row.quality_score,
      display_eligibility: row.display_eligibility,
      display_eligibility_reason: row.display_eligibility_reason ?? undefined,
    })),
  };
}
