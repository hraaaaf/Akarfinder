export type SellerPublicationStatus = "unpublished" | "live" | "paused" | "withdrawn";
export type SellerPublicationAction = "publish" | "pause" | "resume" | "withdraw";

export function nextSellerPublicationStatus(
  current: SellerPublicationStatus | null,
  action: SellerPublicationAction,
): SellerPublicationStatus | null {
  if ((current === null || current === "unpublished") && action === "publish") return "live";
  if (current === "live" && action === "pause") return "paused";
  if (current === "paused" && action === "resume") return "live";
  if ((current === "live" || current === "paused") && action === "withdraw") return "withdrawn";
  return null;
}

export function sellerPublicationActionLabel(action: SellerPublicationAction) {
  return {
    publish: "Mettre mon annonce en ligne",
    pause: "Mettre en pause",
    resume: "Remettre en ligne",
    withdraw: "Retirer l’annonce",
  }[action];
}
