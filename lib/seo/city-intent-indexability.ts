import { getSeoInventoryEligibility } from "@/lib/seo/eligibility-read-model";
import type { SeoEligibilityDecision } from "@/lib/seo/eligibility";
import type { SearchIntent } from "@/lib/seo-city-pages/types";

type SeoEligibilityLoader = typeof getSeoInventoryEligibility;

export type SeoCityIntentIndexability = SeoEligibilityDecision & {
  city: string;
  intent: SearchIntent;
};

export async function getSeoCityIntentIndexability(
  city: string,
  intent: SearchIntent,
  loadEligibility: SeoEligibilityLoader = getSeoInventoryEligibility,
): Promise<SeoCityIntentIndexability> {
  const decision = await loadEligibility({ city, intent });

  return {
    ...decision,
    city,
    intent,
  };
}
