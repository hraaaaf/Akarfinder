import { getSeoInventoryEligibility } from "@/lib/seo/eligibility-read-model";
import type { SeoEligibilityDecision } from "@/lib/seo/eligibility";
import type { SearchIntent } from "@/lib/seo-city-pages/types";

export type SeoCityIntentIndexability = SeoEligibilityDecision & {
  city: string;
  intent: SearchIntent;
};

export async function getSeoCityIntentIndexability(
  city: string,
  intent: SearchIntent,
): Promise<SeoCityIntentIndexability> {
  const decision = await getSeoInventoryEligibility({ city, intent });

  return {
    ...decision,
    city,
    intent,
  };
}
