import type { LivingHereModel, LivingHerePoi } from "@/lib/geo/living-here";

export type LivingHereNeighborhoodCoverageStatus = "covered" | "partial" | "insufficient" | "unavailable";
export type LivingHereNeighborhoodRelation =
  | "inside_certified_boundary"
  | "authority_linked"
  | "near_certified_reference"
  | "unresolved";

export type LivingHereContextPoi = LivingHerePoi & {
  territorialWording: string | null;
  neighborhoodRelation: LivingHereNeighborhoodRelation;
};

export type LivingHereNeighborhoodContext = {
  canonicalNeighborhoodId: string | null;
  city: string | null;
  neighborhood: string | null;
  coverageStatus: LivingHereNeighborhoodCoverageStatus;
  anchorCount: number;
  sourceObservedAt: string | null;
  sourceMode: "ann-l5-certified-seed" | "unavailable";
};

export type LivingHereContextModel = LivingHereModel & {
  neighborhoodContext: LivingHereNeighborhoodContext;
  pois: LivingHereContextPoi[];
  exactPropertyMeasurements?: LivingHereModel | null;
};

export function hasLivingHereNeighborhoodContext(model: LivingHereModel): model is LivingHereContextModel {
  return "neighborhoodContext" in model && typeof (model as { neighborhoodContext?: unknown }).neighborhoodContext === "object";
}
