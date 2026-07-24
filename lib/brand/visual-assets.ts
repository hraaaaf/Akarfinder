export type VisualAssetStatus = "KEEP" | "REDESIGN" | "REPLACE" | "CREATE" | "REMOVE";
export type VisualAssetLayer = "photography" | "identity-illustration" | "functional-icon" | "data-imagery";

export type VisualAssetRecord = {
  id: string;
  label: string;
  layer: VisualAssetLayer;
  status: VisualAssetStatus;
  path?: string;
  notes: string;
};

const identity = (id: string, label: string, path: string): VisualAssetRecord => ({
  id,
  label,
  layer: "identity-illustration",
  status: "CREATE",
  path,
  notes: "AkarFinder Visual System V1 — geometric blue/navy/white proprietary illustration.",
});

export const VISUAL_ASSETS: VisualAssetRecord[] = [
  {
    id: "hero-home",
    label: "Homepage hero photography",
    layer: "photography",
    status: "KEEP",
    path: "/images/hero/akar-residence-sunset-desktop.webp",
    notes: "Real editorial context; mobile variant exists separately.",
  },
  {
    id: "city-photography",
    label: "City photography",
    layer: "photography",
    status: "KEEP",
    notes: "Keep until each city mark passes architectural-fidelity QA.",
  },
  {
    id: "listing-imagery",
    label: "Listing and source imagery",
    layer: "data-imagery",
    status: "KEEP",
    notes: "Data content, not a brand illustration surface. Preserve provenance and source rules.",
  },
  {
    id: "functional-icons",
    label: "Lucide functional icon layer",
    layer: "functional-icon",
    status: "KEEP",
    notes: "Use for controls and universal UI actions; do not redraw merely for branding.",
  },
  identity("property-apartment", "Appartement", "/brand/visual-system/property-apartment.svg"),
  identity("property-villa", "Villa", "/brand/visual-system/property-villa.svg"),
  identity("property-land", "Terrain", "/brand/visual-system/property-land.svg"),
  identity("property-house", "Maison", "/brand/visual-system/property-house.svg"),
  identity("property-riad", "Riad", "/brand/visual-system/property-riad.svg"),
  identity("property-studio", "Studio", "/brand/visual-system/property-studio.svg"),
  identity("property-duplex", "Duplex", "/brand/visual-system/property-duplex.svg"),
  identity("property-penthouse", "Penthouse", "/brand/visual-system/property-penthouse.svg"),
  identity("property-office", "Bureau", "/brand/visual-system/property-office.svg"),
  identity("property-commercial", "Commerce", "/brand/visual-system/property-commercial.svg"),
  identity("property-farm", "Ferme / propriété rurale", "/brand/visual-system/property-farm.svg"),
  identity("property-new-development", "Programme neuf", "/brand/visual-system/property-new-development.svg"),
  identity("intent-buy", "Acheter", "/brand/visual-system/intent-buy.svg"),
  identity("intent-rent", "Louer", "/brand/visual-system/intent-rent.svg"),
  identity("intent-sell", "Vendre", "/brand/visual-system/intent-sell.svg"),
  identity("service-mortgage", "Crédit / financement", "/brand/visual-system/service-mortgage.svg"),
  identity("service-valuation", "Estimation", "/brand/visual-system/service-valuation.svg"),
  identity("service-neighborhood-map", "Quartier / carte", "/brand/visual-system/service-neighborhood-map.svg"),
  identity("service-compare", "Comparaison", "/brand/visual-system/service-compare.svg"),
  identity("service-my-project", "Mon Projet", "/brand/visual-system/service-my-project.svg"),
  identity("service-companion", "Compagnon", "/brand/visual-system/service-companion.svg"),
  identity("service-alerts", "Alertes", "/brand/visual-system/service-alerts.svg"),
  identity("pro-agency-partner", "Agence partenaire", "/brand/visual-system/pro-agency-partner.svg"),
  identity("pro-developer", "Promoteur", "/brand/visual-system/pro-developer.svg"),
  identity("state-no-results", "Aucun résultat", "/brand/visual-system/state-no-results.svg"),
  identity("state-no-image", "Aucune image", "/brand/visual-system/state-no-image.svg"),
  identity("state-project-empty", "Projet vide", "/brand/visual-system/state-project-empty.svg"),
  identity("state-favorites-empty", "Favoris vides", "/brand/visual-system/state-favorites-empty.svg"),
  identity("state-data-limited", "Données limitées", "/brand/visual-system/state-data-limited.svg"),
];

export const PROPERTY_VISUALS = {
  Appartement: "/brand/visual-system/property-apartment.svg",
  Villa: "/brand/visual-system/property-villa.svg",
  Terrain: "/brand/visual-system/property-land.svg",
  Maison: "/brand/visual-system/property-house.svg",
  Riad: "/brand/visual-system/property-riad.svg",
  Studio: "/brand/visual-system/property-studio.svg",
  Duplex: "/brand/visual-system/property-duplex.svg",
  Penthouse: "/brand/visual-system/property-penthouse.svg",
  Bureau: "/brand/visual-system/property-office.svg",
  Commerce: "/brand/visual-system/property-commercial.svg",
  Ferme: "/brand/visual-system/property-farm.svg",
  Neuf: "/brand/visual-system/property-new-development.svg",
} as const;

export const INTENT_VISUALS = {
  Acheter: "/brand/visual-system/intent-buy.svg",
  Louer: "/brand/visual-system/intent-rent.svg",
  Vendre: "/brand/visual-system/intent-sell.svg",
} as const;

export const SERVICE_VISUALS = {
  Credit: "/brand/visual-system/service-mortgage.svg",
  Estimation: "/brand/visual-system/service-valuation.svg",
  Quartier: "/brand/visual-system/service-neighborhood-map.svg",
  Comparaison: "/brand/visual-system/service-compare.svg",
  MonProjet: "/brand/visual-system/service-my-project.svg",
  Compagnon: "/brand/visual-system/service-companion.svg",
  Alertes: "/brand/visual-system/service-alerts.svg",
  AgencePartenaire: "/brand/visual-system/pro-agency-partner.svg",
  Promoteur: "/brand/visual-system/pro-developer.svg",
} as const;

export const STATE_VISUALS = {
  NoResults: "/brand/visual-system/state-no-results.svg",
  NoImage: "/brand/visual-system/state-no-image.svg",
  ProjectEmpty: "/brand/visual-system/state-project-empty.svg",
  FavoritesEmpty: "/brand/visual-system/state-favorites-empty.svg",
  DataLimited: "/brand/visual-system/state-data-limited.svg",
} as const;
