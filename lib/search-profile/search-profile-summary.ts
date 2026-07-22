// SEARCH-PROFILE-ONBOARDING-MVP-1
// Pure summary builder for the guided search profile. No backend involved.
// Wording stays indicative: no promise, no guarantee, no forbidden terms.

import {
  AUDIENCE_OPTIONS,
  NEIGHBORHOOD_NEED_OPTIONS,
  PRIORITY_OPTIONS,
  PROJECT_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  type SearchProfile,
  type SearchProject,
} from "./search-profile-types";

export interface SearchProfileSummaryLine {
  label: string;
  value: string;
}

export interface SearchProfileSummary {
  lines: SearchProfileSummaryLine[];
  essentials: string[];
  checkpoints: string[];
  searchHref: string;
}

const RENT_PROJECTS: SearchProject[] = ["louer"];
const BUY_PROJECTS: SearchProject[] = ["acheter", "investir", "neuf", "terrain", "plus_tard"];

export function buildSearchProfileSummary(profile: SearchProfile): SearchProfileSummary {
  const lines: SearchProfileSummaryLine[] = [];

  const audience = AUDIENCE_OPTIONS.find((o) => o.value === profile.audience)?.label;
  if (audience) lines.push({ label: "Profil", value: audience });

  const project = PROJECT_OPTIONS.find((o) => o.value === profile.project)?.label;
  if (project) lines.push({ label: "Projet", value: project });

  const propertyType = PROPERTY_TYPE_OPTIONS.find((o) => o.value === profile.propertyType)?.label;
  if (propertyType) lines.push({ label: "Type de bien", value: propertyType });

  const zone = [profile.neighborhood, profile.city].filter(nonEmpty).join(", ");
  if (zone) lines.push({ label: "Zone", value: zone });

  const budget = budgetLine(profile);
  if (budget) lines.push({ label: "Budget indicatif", value: budget });

  const horizon = horizonLine(profile);
  if (horizon) lines.push({ label: "Horizon", value: horizon });

  return {
    lines,
    essentials: essentialCriteria(profile),
    checkpoints: checkpointsFor(profile.project),
    searchHref: buildSearchHref(profile),
  };
}

function budgetLine(profile: SearchProfile): string {
  if (profile.project && RENT_PROJECTS.includes(profile.project)) {
    return nonEmpty(profile.monthlyBudget) ? `${profile.monthlyBudget} DH/mois` : "";
  }
  if (profile.project === "vendre") return "";
  return nonEmpty(profile.budgetTotal) ? `${profile.budgetTotal} DH` : "";
}

function horizonLine(profile: SearchProfile): string {
  if (profile.project === "louer") return profile.moveInDate.trim();
  if (profile.project === "vendre") return profile.saleHorizon.trim();
  return profile.purchaseHorizon.trim();
}

function essentialCriteria(profile: SearchProfile): string[] {
  const essentials: string[] = [];
  if (nonEmpty(profile.minSurface)) essentials.push(`Surface min. ${profile.minSurface} m²`);
  if (nonEmpty(profile.bedrooms)) essentials.push(`${profile.bedrooms} chambre(s)`);
  if (nonEmpty(profile.bathrooms)) essentials.push(`${profile.bathrooms} salle(s) de bain`);
  if (profile.elevator) essentials.push("Ascenseur");
  if (profile.parking) essentials.push("Parking");
  if (profile.terrace) essentials.push("Terrasse");
  if (profile.securedResidence) essentials.push("Résidence sécurisée");
  if (profile.worksAccepted) essentials.push("Travaux acceptés");
  if (nonEmpty(profile.orientation)) essentials.push(`Orientation ${profile.orientation}`);

  for (const need of profile.neighborhoodNeeds) {
    const label = NEIGHBORHOOD_NEED_OPTIONS.find((o) => o.value === need)?.label;
    if (label) essentials.push(label);
  }
  for (const priority of profile.priorities) {
    const label = PRIORITY_OPTIONS.find((o) => o.value === priority)?.label;
    if (label) essentials.push(`Priorité : ${label}`);
  }
  return essentials;
}

// Indicative pre-contact checkpoints — same spirit as the demo property
// checklist: things to confirm with the source, never a guarantee.
function checkpointsFor(project?: SearchProject): string[] {
  if (project === "louer") {
    return [
      "Conditions de bail et caution",
      "Charges incluses ou non",
      "État des lieux et équipements",
      "Durée d'engagement",
    ];
  }
  if (project === "vendre") {
    return [
      "Titre foncier et documents",
      "Charges de copropriété",
      "Diagnostic de l'état du bien",
      "Frais et délais de vente",
    ];
  }
  return [
    "Titre foncier",
    "Charges de copropriété",
    "État des parties communes",
    "Stationnement réel",
    "Conformité de la surface",
  ];
}

function parsePositiveNumber(value: string | undefined): number | null {
  if (!nonEmpty(value)) return null;
  const parsed = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

// Build a deterministic internal /search link from the legacy profile.
// All fields currently supported by /search are transmitted structurally;
// neighborhood remains in q because Search has no dedicated neighborhood param yet.
export function buildSearchHref(profile: SearchProfile): string {
  const params = new URLSearchParams();
  const propertyType = PROPERTY_TYPE_OPTIONS.find((o) => o.value === profile.propertyType)?.label;

  if (nonEmpty(profile.city)) params.set("city", profile.city.trim());
  if (nonEmpty(profile.neighborhood)) params.set("q", profile.neighborhood.trim());
  if (propertyType) params.set("property_type", propertyType);

  if (profile.project === "louer") params.set("transaction_type", "rent");
  else if (profile.project === "neuf") params.set("transaction_type", "new");
  else if (profile.project && BUY_PROJECTS.includes(profile.project)) {
    params.set("transaction_type", "buy");
  }

  const budget = profile.project === "louer"
    ? parsePositiveNumber(profile.monthlyBudget)
    : parsePositiveNumber(profile.budgetTotal);
  if (budget != null) params.set("max_price", String(budget));

  const minSurface = parsePositiveNumber(profile.minSurface);
  if (minSurface != null) params.set("min_surface", String(minSurface));

  // Preserve the richer legacy criteria for the guided journey hand-off.
  // Search can progressively consume these without silently losing user intent.
  if (nonEmpty(profile.bedrooms)) params.set("profile_bedrooms", profile.bedrooms.trim());
  if (nonEmpty(profile.bathrooms)) params.set("profile_bathrooms", profile.bathrooms.trim());
  if (profile.parking) params.set("profile_parking", "1");
  if (profile.elevator) params.set("profile_elevator", "1");
  if (profile.terrace) params.set("profile_terrace", "1");
  if (profile.securedResidence) params.set("profile_secured_residence", "1");
  if (profile.worksAccepted) params.set("profile_works_accepted", "1");
  if (nonEmpty(profile.orientation)) params.set("profile_orientation", profile.orientation.trim());
  if (profile.neighborhoodNeeds.length > 0) params.set("profile_neighborhood_needs", profile.neighborhoodNeeds.join(","));
  if (profile.priorities.length > 0) params.set("profile_priorities", profile.priorities.join(","));
  params.set("guided", "1");

  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

function nonEmpty(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
