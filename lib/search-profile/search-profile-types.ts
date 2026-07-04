// SEARCH-PROFILE-ONBOARDING-MVP-1
// Guided search profile — frontend-only MVP. No backend, no DB: the profile
// lives in component state and optionally in localStorage. Everything is
// indicative and non-contractual; no real contact is required.

export type SearchAudience =
  | "moi_seul"
  | "jeune_couple"
  | "famille_enfants"
  | "famille_nombreuse"
  | "mre"
  | "investisseur"
  | "etudiant"
  | "retraite"
  | "parent_pour_enfant"
  | "entreprise"
  | "profession_liberale"
  | "autre";

export type SearchProject =
  | "acheter"
  | "louer"
  | "vendre"
  | "investir"
  | "neuf"
  | "terrain"
  | "comparer_quartiers"
  | "plus_tard";

export type SearchPropertyType =
  | "appartement"
  | "villa"
  | "maison"
  | "studio"
  | "duplex"
  | "penthouse"
  | "terrain"
  | "bureau"
  | "local_commercial"
  | "projet_neuf";

export type SearchNeighborhoodNeed =
  | "ecoles"
  | "creches"
  | "tram"
  | "mosquee"
  | "clinique_pharmacie"
  | "supermarche"
  | "restaurants_cafes"
  | "grands_axes"
  | "proximite_travail"
  | "proximite_famille"
  | "calme"
  | "quartier_vivant"
  | "stationnement"
  | "plage"
  | "centre_ville";

export type SearchPriority =
  | "prix"
  | "quartier"
  | "surface"
  | "ecole"
  | "transport"
  | "calme"
  | "rentabilite"
  | "rapidite";

export interface SearchProfile {
  audience?: SearchAudience;
  project?: SearchProject;
  propertyType?: SearchPropertyType;
  // Zone (all projects)
  city: string;
  neighborhood: string;
  // Budget — achat/investir/neuf/terrain
  budgetTotal: string;
  downPayment: string;
  creditPlanned?: boolean;
  purchaseHorizon: string;
  // Budget — location
  monthlyBudget: string;
  furnished?: boolean;
  moveInDate: string;
  rentalDuration: string;
  // Vente
  saleSurface: string;
  saleCondition: string;
  saleHorizon: string;
  saleNeedsAgency?: boolean;
  // Criteres bien
  minSurface: string;
  bedrooms: string;
  bathrooms: string;
  floor: string;
  elevator?: boolean;
  parking?: boolean;
  terrace?: boolean;
  orientation: string;
  securedResidence?: boolean;
  worksAccepted?: boolean;
  // Quartier + priorites
  neighborhoodNeeds: SearchNeighborhoodNeed[];
  priorities: SearchPriority[];
}

export const EMPTY_SEARCH_PROFILE: SearchProfile = {
  city: "",
  neighborhood: "",
  budgetTotal: "",
  downPayment: "",
  purchaseHorizon: "",
  monthlyBudget: "",
  moveInDate: "",
  rentalDuration: "",
  saleSurface: "",
  saleCondition: "",
  saleHorizon: "",
  minSurface: "",
  bedrooms: "",
  bathrooms: "",
  floor: "",
  orientation: "",
  neighborhoodNeeds: [],
  priorities: [],
};

export const AUDIENCE_OPTIONS: { value: SearchAudience; label: string }[] = [
  { value: "moi_seul", label: "Moi seul(e)" },
  { value: "jeune_couple", label: "Jeune couple" },
  { value: "famille_enfants", label: "Famille avec enfants" },
  { value: "famille_nombreuse", label: "Famille nombreuse" },
  { value: "mre", label: "MRE" },
  { value: "investisseur", label: "Investisseur" },
  { value: "etudiant", label: "Étudiant" },
  { value: "retraite", label: "Retraité" },
  { value: "parent_pour_enfant", label: "Parent pour un enfant" },
  { value: "entreprise", label: "Entreprise / collaborateur" },
  { value: "profession_liberale", label: "Profession libérale" },
  { value: "autre", label: "Autre" },
];

export const PROJECT_OPTIONS: { value: SearchProject; label: string }[] = [
  { value: "acheter", label: "Acheter" },
  { value: "louer", label: "Louer" },
  { value: "vendre", label: "Vendre" },
  { value: "investir", label: "Investir" },
  { value: "neuf", label: "Programme neuf" },
  { value: "terrain", label: "Terrain" },
  { value: "comparer_quartiers", label: "Comparer les quartiers" },
  { value: "plus_tard", label: "Chercher pour plus tard" },
];

export const PROPERTY_TYPE_OPTIONS: { value: SearchPropertyType; label: string }[] = [
  { value: "appartement", label: "Appartement" },
  { value: "villa", label: "Villa" },
  { value: "maison", label: "Maison" },
  { value: "studio", label: "Studio" },
  { value: "duplex", label: "Duplex" },
  { value: "penthouse", label: "Penthouse" },
  { value: "terrain", label: "Terrain" },
  { value: "bureau", label: "Bureau" },
  { value: "local_commercial", label: "Local commercial" },
  { value: "projet_neuf", label: "Projet neuf" },
];

export const NEIGHBORHOOD_NEED_OPTIONS: { value: SearchNeighborhoodNeed; label: string }[] = [
  { value: "ecoles", label: "Écoles" },
  { value: "creches", label: "Crèches" },
  { value: "tram", label: "Tram" },
  { value: "mosquee", label: "Mosquée" },
  { value: "clinique_pharmacie", label: "Clinique / pharmacie" },
  { value: "supermarche", label: "Supermarché" },
  { value: "restaurants_cafes", label: "Restaurants / cafés" },
  { value: "grands_axes", label: "Grands axes" },
  { value: "proximite_travail", label: "Proximité travail" },
  { value: "proximite_famille", label: "Proximité famille" },
  { value: "calme", label: "Calme" },
  { value: "quartier_vivant", label: "Quartier vivant" },
  { value: "stationnement", label: "Stationnement" },
  { value: "plage", label: "Plage" },
  { value: "centre_ville", label: "Centre-ville" },
];

export const PRIORITY_OPTIONS: { value: SearchPriority; label: string }[] = [
  { value: "prix", label: "Prix" },
  { value: "quartier", label: "Quartier" },
  { value: "surface", label: "Surface" },
  { value: "ecole", label: "École" },
  { value: "transport", label: "Transport" },
  { value: "calme", label: "Calme" },
  { value: "rentabilite", label: "Rentabilité" },
  { value: "rapidite", label: "Rapidité" },
];

export const SEARCH_PROFILE_STORAGE_KEY = "akarfinder.search-profile.v1";
