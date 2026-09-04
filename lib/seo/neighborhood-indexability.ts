import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import {
  evaluateSeoInventoryEvidence,
  SEO_INVENTORY_GATE_V1,
  unavailableSeoInventoryDecision,
  type SeoEligibilityDecision,
} from "@/lib/seo/eligibility";

const NEIGHBORHOOD_SHADOW_VIEW = "odm_neighborhood_offer_shadow_listing_v1";
const SOURCE_EVIDENCE_PAGE_SIZE = 500;

type NeighborhoodScope = {
  citySlug: string;
  neighborhoodSlug: string;
};

type SourceEvidenceRow = {
  source_domain: string | null;
};

/**
 * Generic neighborhood SEO availability gate.
 *
 * This deliberately uses offer-level territorial evidence rather than market
 * metric certification: a neighborhood page may be useful without publishing
 * price statistics, but it still needs enough fresh public offers and source
 * diversity to deserve indexation.
 */
export async function getSeoNeighborhoodIndexability(
  scope: NeighborhoodScope,
): Promise<SeoEligibilityDecision> {
  const citySlug = scope.citySlug.trim().toLowerCase();
  const neighborhoodSlug = scope.neighborhoodSlug.trim().toLowerCase();
  if (!citySlug || !neighborhoodSlug) return unavailableSeoInventoryDecision();

  try {
    const supabase = getSupabaseServerClient();
    const sourceDomains = new Set<string>();
    let listingCount: number | null = null;
    let offset = 0;

    while (true) {
      const { data, error, count } = await supabase
        .from(NEIGHBORHOOD_SHADOW_VIEW)
        .select("source_domain", { count: "exact" })
        .eq("city_slug", citySlug)
        .eq("neighborhood_slug", neighborhoodSlug)
        .eq("display_eligibility", "eligible_primary")
        .eq("freshness_status", "fresh_confirmed")
        .order("source_domain", { ascending: true })
        .range(offset, offset + SOURCE_EVIDENCE_PAGE_SIZE - 1);

      if (error) throw error;
      const rows = (data ?? []) as SourceEvidenceRow[];
      if (offset === 0) {
        if (count == null || !Number.isFinite(count)) return unavailableSeoInventoryDecision();
        listingCount = count;
      }

      for (const row of rows) {
        const source = row.source_domain?.trim().toLowerCase();
        if (source) sourceDomains.add(source);
      }

      if (sourceDomains.size >= SEO_INVENTORY_GATE_V1.minSources) break;
      if (rows.length < SOURCE_EVIDENCE_PAGE_SIZE) break;
      offset += SOURCE_EVIDENCE_PAGE_SIZE;
      if (listingCount != null && offset >= listingCount) break;
    }

    if (listingCount == null) return unavailableSeoInventoryDecision();
    return evaluateSeoInventoryEvidence({
      listingCount,
      sourceCount: sourceDomains.size,
    });
  } catch (error) {
    console.error("[seo-neighborhood-indexability] inventory unavailable", {
      citySlug,
      neighborhoodSlug,
      error,
    });
    return unavailableSeoInventoryDecision();
  }
}
