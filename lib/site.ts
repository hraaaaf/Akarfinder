export type NavItem = {
  href: string;
  label: string;
};

export type SearchChip = {
  label: string;
};

export type ValueCard = {
  title: string;
  description: string;
  accent: string;
};

export type ListingPreviewItem = {
  title: string;
  location: string;
  price: string;
  surface: string;
  pricePerSquareMeter: string;
  freshness: string;
  sourceType: string;
  reliability: string;
  reliabilityTone: "high" | "medium" | "review";
  badge: string;
  isNew?: boolean;
  isFeatured?: boolean;
  bedrooms?: number;
  bathrooms?: number;
  imageUrl: string;
  listingId?: string;
};

export type MapCity = {
  city: string;
  x: number;
  y: number;
};

export type CitySpotlight = {
  name: string;
  listings: string;
  avgPrice: string;
  color: string;
  color2: string;
};

export const siteCopy = {
  badge: "Version bêta",
  brand: "AkarFinder",
  headline: "Le 1er moteur de recherche immobilier au Maroc.",
  subheadline: "Tout l'immobilier marocain dans un seul endroit : explorez, comparez et contactez avec plus de confiance."
};

export const navItems: NavItem[] = [
  { href: "/", label: "Accueil" },
  { href: "/acheter", label: "Acheter" },
  { href: "/louer", label: "Louer" },
  { href: "/neuf", label: "Neuf" },
  { href: "/vendre", label: "Vendre" },
  { href: "/map", label: "Carte" },
  { href: "/search", label: "Recherche" },
];

export const searchTabs = ["Achat", "Location", "Neuf"] as const;

export const searchChips: SearchChip[] = [
  { label: "Appart. Maârif · Casablanca" },
  { label: "Villa Bouskoura piscine" },
  { label: "Studio louer Agdal · Rabat" },
];

export const heroCities = [
  "Casablanca",
  "Rabat",
  "Marrakech",
  "Tanger",
  "Agadir",
  "Fès"
];

export const valueCards: ValueCard[] = [
  {
    title: "Recherche multi-sources",
    description:
      "Une seule interface pour comparer les biens issus de plusieurs canaux, sans logos partenaires simulés.",
    accent: "S"
  },
  {
    title: "Doublons regroupés",
    description:
      "Les annonces similaires sont rapprochées pour réduire le bruit et accélérer la comparaison.",
    accent: "D"
  },
  {
    title: "Filtre de fiabilité",
    description:
      "Fraîcheur, complétude et cohérence deviennent des signaux lisibles avant le contact.",
    accent: "F"
  },
  {
    title: "Pensé pour les MRE",
    description:
      "WhatsApp, brochure, visite à distance et délai clair deviennent des repères de confiance.",
    accent: "M"
  }
];

export const mapCities: MapCity[] = [
  { city: "Tanger", x: 70, y: 18 },
  { city: "Rabat", x: 62, y: 28 },
  { city: "Casablanca", x: 58, y: 34 },
  { city: "Fès", x: 72, y: 30 },
  { city: "Marrakech", x: 54, y: 47 },
  { city: "Agadir", x: 42, y: 63 }
];

export const citiesSpotlight: CitySpotlight[] = [
  { name: "Casablanca", listings: "32 450", avgPrice: "13 200 DH/m²", color: "#1e3a8a", color2: "#2563eb" },
  { name: "Rabat", listings: "14 200", avgPrice: "11 500 DH/m²", color: "#065f46", color2: "#059669" },
  { name: "Marrakech", listings: "8 900", avgPrice: "9 800 DH/m²", color: "#7c2d12", color2: "#ea580c" },
  { name: "Tanger", listings: "6 700", avgPrice: "8 900 DH/m²", color: "#1e40af", color2: "#3b82f6" },
  { name: "Agadir", listings: "4 200", avgPrice: "7 600 DH/m²", color: "#164e63", color2: "#0891b2" },
  { name: "Fès", listings: "3 100", avgPrice: "6 900 DH/m²", color: "#3b0764", color2: "#9333ea" },
];

// Qualitative product signals only — no unverified numeric claims.
export const siteStats = [
  { value: "Multi-sources", label: "Annonces regroupées" },
  { value: "Fiabilité", label: "Signaux lisibles" },
  { value: "WhatsApp", label: "Contact direct" },
  { value: "MRE", label: "Achat à distance" },
];

export const whyReasons = [
  "Centralisation des annonces de plusieurs sources marocaines",
  "Regroupement des doublons pour comparer plus vite",
  "Signaux de fiabilité lisibles avant le contact",
  "Filtres pensés pour les MRE (visite à distance, WhatsApp)",
  "Repères de quartier indicatifs par ville",
  "Contact rapide via WhatsApp",
];

// Generic source categories — no named third-party brands or logos.
export const sources = [
  "Portails immobiliers",
  "Agences",
  "Promoteurs",
  "Annonces publiques",
];

export const listingPreviewItems: ListingPreviewItem[] = [
  {
    title: "Appartement lumineux avec terrasse",
    location: "Casablanca, Finance City",
    price: "1 250 000 DH",
    surface: "85 m²",
    pricePerSquareMeter: "14 706 DH/m²",
    freshness: "Récent",
    sourceType: "Source analysée",
    reliability: "Informations complètes",
    reliabilityTone: "high",
    badge: "Signal fort",
    isNew: true,
    bedrooms: 3,
    bathrooms: 2,
    imageUrl: "/images/listings/appartement-casablanca.jpg"
  },
  {
    title: "Villa familiale avec piscine",
    location: "Marrakech, Route de l'Ourika",
    price: "3 800 000 DH",
    surface: "450 m²",
    pricePerSquareMeter: "8 444 DH/m²",
    freshness: "Cette semaine",
    sourceType: "Agence",
    reliability: "À comparer",
    reliabilityTone: "review",
    badge: "Nouveau",
    isNew: true,
    bedrooms: 5,
    bathrooms: 3,
    imageUrl: "/images/listings/villa-marrakech.jpg"
  },
  {
    title: "Appartement neuf bien situé",
    location: "Rabat, Hay Riad",
    price: "2 100 000 DH",
    surface: "120 m²",
    pricePerSquareMeter: "17 500 DH/m²",
    freshness: "Projet suivi",
    sourceType: "Promoteur",
    reliability: "Infos limitées",
    reliabilityTone: "medium",
    badge: "MRE",
    isFeatured: true,
    bedrooms: 3,
    bathrooms: 2,
    imageUrl: "/images/listings/appartement-rabat.jpg"
  },
  {
    title: "Studio meublé proche corniche",
    location: "Tanger, Malabata",
    price: "650 000 DH",
    surface: "45 m²",
    pricePerSquareMeter: "14 444 DH/m²",
    freshness: "Récent",
    sourceType: "Source analysée",
    reliability: "Informations complètes",
    reliabilityTone: "high",
    badge: "Compact",
    bedrooms: 1,
    bathrooms: 1,
    imageUrl: "/images/listings/studio-tanger.jpg"
  },
  {
    title: "Terrain résidentiel à vendre",
    location: "Bouskoura",
    price: "1 500 000 DH",
    surface: "600 m²",
    pricePerSquareMeter: "2 500 DH/m²",
    freshness: "À confirmer",
    sourceType: "Source analysée",
    reliability: "Doublon possible",
    reliabilityTone: "review",
    badge: "Terrain",
    imageUrl: "/images/listings/terrain-bouskoura.jpg"
  }
];
