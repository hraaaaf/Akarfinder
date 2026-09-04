export type AmbiguityResolutionStep = "classify_from_card" | "inspect_allowed_detail" | "human_review";

export function nextAmbiguityResolutionStep(input: {
  cardClear: boolean;
  detailRobotsAllowed: boolean;
  detailClear?: boolean;
}): AmbiguityResolutionStep {
  if (input.cardClear) return "classify_from_card";
  if (input.detailClear === true) return "classify_from_card";
  if (input.detailClear === false) return "human_review";
  if (input.detailRobotsAllowed) return "inspect_allowed_detail";
  return "human_review";
}
