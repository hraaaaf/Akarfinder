import type { BuyerProfile, LeadTemperature, LeadTemperatureResult } from "./types";

export function computeLeadTemperature(profile: BuyerProfile): LeadTemperatureResult {
  const hasPhone = typeof profile.phone === "string" && profile.phone.trim().length >= 8;
  const hasBudget = typeof profile.budgetTotal === "number" && profile.budgetTotal > 0;
  const hasCity = typeof profile.city === "string" && profile.city.trim().length > 0;
  const hasConsent = profile.consentContact === true;
  const isHotTiming = profile.timing === "urgent" || profile.timing === "1-3mois";
  const isWarmTiming = profile.timing === "3-6mois";

  if (isHotTiming && hasBudget && hasPhone && hasConsent) {
    return {
      temperature: "chaud",
      label: "Projet actif",
      reason: "Timing court, budget défini, contact disponible.",
      color: "emerald",
    };
  }

  if (isWarmTiming && (hasBudget || hasCity)) {
    return {
      temperature: "tiède",
      label: "Projet en cours",
      reason: "Horizon 3–6 mois, critères partiellement définis.",
      color: "amber",
    };
  }

  if (isHotTiming && (hasBudget || hasCity) && !hasPhone) {
    return {
      temperature: "tiède",
      label: "Projet actif sans contact",
      reason: "Timing court mais coordonnées manquantes.",
      color: "amber",
    };
  }

  return {
    temperature: "froid",
    label: "Veille ou profil incomplet",
    reason: "Timing long ou informations insuffisantes pour qualifier le projet.",
    color: "slate",
  };
}

export function getTemperatureDisplay(temperature: LeadTemperature): {
  emoji: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  switch (temperature) {
    case "chaud":
      return {
        emoji: "🔥",
        bgClass: "bg-emerald-50",
        textClass: "text-emerald-800",
        borderClass: "border-emerald-200",
      };
    case "tiède":
      return {
        emoji: "⚡",
        bgClass: "bg-amber-50",
        textClass: "text-amber-800",
        borderClass: "border-amber-200",
      };
    case "froid":
    default:
      return {
        emoji: "📋",
        bgClass: "bg-slate-50",
        textClass: "text-slate-700",
        borderClass: "border-slate-200",
      };
  }
}
