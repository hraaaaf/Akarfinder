export const SELLER_REVIEW_REASONS = [
  "missing_information",
  "photo_quality",
  "price_to_confirm",
  "location_to_confirm",
  "description_to_improve",
] as const;

export type SellerReviewReason = (typeof SELLER_REVIEW_REASONS)[number];
export type SellerReviewStatus =
  | "draft"
  | "uploading"
  | "ready_for_review"
  | "needs_changes"
  | "resubmitted"
  | "approved";

const LABELS: Record<SellerReviewReason, string> = {
  missing_information: "Ajoutez les informations manquantes",
  photo_quality: "Remplacez ou complétez certaines photos",
  price_to_confirm: "Confirmez le prix souhaité",
  location_to_confirm: "Précisez la localisation",
  description_to_improve: "Complétez la description",
};

export function isSellerReviewReason(value: unknown): value is SellerReviewReason {
  return typeof value === "string" && SELLER_REVIEW_REASONS.includes(value as SellerReviewReason);
}

export function normalizeSellerReviewReasons(values: unknown): SellerReviewReason[] {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.filter(isSellerReviewReason)));
}

export function sellerReviewReasonLabel(reason: SellerReviewReason) {
  return LABELS[reason];
}

export function canSellerResubmit(status: SellerReviewStatus) {
  return status === "needs_changes";
}

export function canReviewerDecide(status: SellerReviewStatus) {
  return status === "ready_for_review" || status === "resubmitted";
}
