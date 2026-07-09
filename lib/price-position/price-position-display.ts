import { getMarketReference } from "@/lib/market/get-market-reference";
import type { Listing } from "@/lib/listings/types";
import { canShowIndicativePricePosition } from "./public-safety";
import type { PricePositionDisplay } from "./types";

const PUBLIC_DESCRIPTION =
  "Ce repère aide à comparer l'information affichée. Il ne remplace pas la vérification sur la source originale.";

function toneForPosition(position: "coherent" | "high" | "low") {
  if (position === "high") return "warning";
  if (position === "low") return "success";
  return "info";
}

function labelForPosition(position: "coherent" | "high" | "low") {
  if (position === "high") return "Positionnement indicatif haut";
  if (position === "low") return "Positionnement indicatif bas";
  return "Positionnement indicatif proche";
}

export function getIndicativePricePositionDisplay(listing: Listing): PricePositionDisplay | null {
  if (!canShowIndicativePricePosition(listing)) return null;

  const reference = getMarketReference(
    listing.city,
    listing.neighborhood,
    listing.property_type,
    listing.transaction_type === "rent" ? "rent" : "buy",
    listing.price_per_m2
  );

  if (!reference) return null;

  const importantGap = Math.abs(reference.position_pct) >= 20;

  return {
    title: "Repère prix indicatif",
    label: labelForPosition(reference.position),
    description: PUBLIC_DESCRIPTION,
    note: importantGap ? "Écart indicatif important" : "Données indicatives, non officielles",
    tone: toneForPosition(reference.position),
    isImportantGap: importantGap,
  };
}
