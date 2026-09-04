import { getSeoInventoryEligibility } from "@/lib/seo/eligibility-read-model";
import type { SeoEligibilityDecision } from "@/lib/seo/eligibility";

export type SeoCityIndexability = {
  eligible: boolean;
  acheter: SeoEligibilityDecision;
  louer: SeoEligibilityDecision;
};

export function combineSeoCityIntentEligibility(
  acheter: SeoEligibilityDecision,
  louer: SeoEligibilityDecision,
): SeoCityIndexability {
  return {
    eligible: acheter.eligible || louer.eligible,
    acheter,
    louer,
  };
}

export async function getSeoCityIndexability(city: string): Promise<SeoCityIndexability> {
  const [acheter, louer] = await Promise.all([
    getSeoInventoryEligibility({ city, intent: "acheter" }),
    getSeoInventoryEligibility({ city, intent: "louer" }),
  ]);

  return combineSeoCityIntentEligibility(acheter, louer);
}
