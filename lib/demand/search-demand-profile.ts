// DEMAND-CAPTURE-MVP-1
// Turns a guided search profile into a structured, qualified demand payload.
// Prudent MVP: pure logic only — no DB, no API, no automatic sending.
// A real contact is only ever included with explicit consent, and nothing
// is transmitted anywhere by this module.

import type { SearchProfile } from "@/lib/search-profile/search-profile-types";
import {
  AUDIENCE_OPTIONS,
  NEIGHBORHOOD_NEED_OPTIONS,
  PRIORITY_OPTIONS,
  PROJECT_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
} from "@/lib/search-profile/search-profile-types";

export interface SearchDemandContact {
  name: string;
  reachVia: string;
  consent: boolean;
}

export interface SearchDemandProfile {
  profileLabel: string;
  intentionLabel: string;
  propertyTypeLabel: string;
  zone: string;
  budget: string;
  surface: string;
  urgency: string;
  priorities: string[];
  neighborhoodConstraints: string[];
  nonNegotiables: string[];
  // Contact is present only when explicitly consented.
  contact: { name: string; reachVia: string } | null;
  consentGiven: boolean;
}

export function buildSearchDemandProfile(
  profile: SearchProfile,
  contact?: SearchDemandContact,
): SearchDemandProfile {
  const isRent = profile.project === "louer";

  const priorities = profile.priorities
    .map((p) => PRIORITY_OPTIONS.find((o) => o.value === p)?.label)
    .filter((l): l is string => Boolean(l));

  const neighborhoodConstraints = profile.neighborhoodNeeds
    .map((n) => NEIGHBORHOOD_NEED_OPTIONS.find((o) => o.value === n)?.label)
    .filter((l): l is string => Boolean(l));

  const nonNegotiables: string[] = [];
  if (profile.securedResidence) nonNegotiables.push("Résidence sécurisée");
  if (profile.elevator) nonNegotiables.push("Ascenseur");
  if (profile.parking) nonNegotiables.push("Parking");
  if (profile.terrace) nonNegotiables.push("Terrasse");
  if (nonEmpty(profile.bedrooms)) nonNegotiables.push(`${profile.bedrooms} chambre(s) minimum`);

  const consentGiven = contact?.consent === true;
  const hasContactDetails = Boolean(contact && (nonEmpty(contact.name) || nonEmpty(contact.reachVia)));

  return {
    profileLabel: labelOf(AUDIENCE_OPTIONS, profile.audience) ?? "Non précisé",
    intentionLabel: labelOf(PROJECT_OPTIONS, profile.project) ?? "Non précisé",
    propertyTypeLabel: labelOf(PROPERTY_TYPE_OPTIONS, profile.propertyType) ?? "Non précisé",
    zone: [profile.neighborhood, profile.city].filter(nonEmpty).join(", ") || "Non précisée",
    budget: isRent
      ? (nonEmpty(profile.monthlyBudget) ? `${profile.monthlyBudget} DH/mois` : "Non précisé")
      : (nonEmpty(profile.budgetTotal) ? `${profile.budgetTotal} DH` : "Non précisé"),
    surface: nonEmpty(profile.minSurface) ? `${profile.minSurface} m² min.` : "Non précisée",
    urgency: (isRent ? profile.moveInDate : profile.purchaseHorizon).trim() || "Non précisée",
    priorities,
    neighborhoodConstraints,
    nonNegotiables,
    // Consent gate: without explicit consent, contact details never enter
    // the demand payload.
    contact: consentGiven && hasContactDetails
      ? { name: contact!.name.trim(), reachVia: contact!.reachVia.trim() }
      : null,
    consentGiven,
  };
}

function labelOf<T extends string>(
  options: { value: T; label: string }[],
  value: T | undefined,
): string | undefined {
  return options.find((o) => o.value === value)?.label;
}

function nonEmpty(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
