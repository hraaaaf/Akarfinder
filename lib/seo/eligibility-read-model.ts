// SEO-ELIGIBILITY-READ-MODEL-V1
// Server-only by contract: uses the Supabase service-role client. Never import from client components.

import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { getCitySearchVariants } from "@/lib/geo/geo-entity-registry";
import {
  evaluateSeoInventoryEvidence,
  getInventoryIntentVariants,
  getInventoryPropertyTypeVariants,
  SEO_INVENTORY_GATE_V1,
  unavailableSeoInventoryDecision,
  type CanonicalSeoPropertyType,
  type SeoEligibilityDecision,
  type SeoIntentSlug,
} from "@/lib/seo/eligibility";

const PUBLIC_SEARCH_VIEW = "public_search_representations_v1";
const SOURCE_EVIDENCE_PAGE_SIZE = 500;

type SeoInventoryScope = {
  city: string;
  intent: SeoIntentSlug;
  propertyType?: CanonicalSeoPropertyType;
};

type SourceEvidenceRow = {
  source_domain: string | null;
};

/**
 * Reads only the public Search representation model already filtered by the
 * strict inventory states used by SEO-2: eligible_primary + fresh_confirmed.
 *
 * We stop scanning once the source-diversity floor is proven; if it is not
 * proven, pagination continues until the segment is exhausted. This avoids a
 * false positive while keeping qualifying segments cheap.
 */
export async function getSeoInventoryEligibility(scope: SeoInventoryScope): Promise<SeoEligibilityDecision> {
  const cityVariants = getCitySearchVariants(scope.city).filter(Boolean);
  if (cityVariants.length === 0) return unavailableSeoInventoryDecision();

  try {
    const supabase = getSupabaseServerClient();
    const sourceDomains = new Set<string>();
    let listingCount: number | null = null;
    let offset = 0;

    while (true) {
      let query = supabase
        .from(PUBLIC_SEARCH_VIEW)
        .select("source_domain", { count: "exact" })
        .eq("display_eligibility", "eligible_primary")
        .eq("freshness_status", "fresh_confirmed")
        .in("normalized_city", cityVariants)
        .in("normalized_intent", [...getInventoryIntentVariants(scope.intent)])
        .order("source_domain", { ascending: true });

      if (scope.propertyType) {
        query = query.in(
          "normalized_property_type",
          [...getInventoryPropertyTypeVariants(scope.propertyType)],
        );
      }

      const { data, error, count } = await query.range(
        offset,
        offset + SOURCE_EVIDENCE_PAGE_SIZE - 1,
      );

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
    console.error("[seo-eligibility] public inventory unavailable", {
      city: scope.city,
      intent: scope.intent,
      propertyType: scope.propertyType ?? null,
      error,
    });
    return unavailableSeoInventoryDecision();
  }
}
