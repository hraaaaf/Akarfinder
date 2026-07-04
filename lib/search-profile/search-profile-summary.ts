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

// Build an internal /search link from the profile — presentation only,
// nothing is sent anywhere.
export function buildSearchHref(profile: SearchProfile): string {
  const terms: string[] = [];
  const propertyType = PROPERTY_TYPE_OPTIONS.find((o) => o.value === profile.propertyType)?.label;
  if (propertyType) terms.push(propertyType.toLowerCase());
  if (nonEmpty(profile.neighborhood)) terms.push(profile.neighborhood.trim());
  if (nonEmpty(profile.city)) terms.push(profile.city.trim());

  const params = new URLSearchParams();
  if (terms.length > 0) params.set("q", terms.join(" "));
  if (profile.project === "louer") params.set("transaction", "rent");
  else if (profile.project === "neuf") params.set("transaction", "new");
  else if (profile.project && BUY_PROJECTS.includes(profile.project)) {
    params.set("transaction", "buy");
  }

  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

function nonEmpty(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
