// DEMO-SHOWCASE-MODE-1
// Entirely fictional data for the /demo showcase route. Nothing here is
// fetched from Search Gateway, Supabase, or any live database — every value
// is a hardcoded illustrative placeholder, clearly labeled "démo" wherever
// displayed. No real promoter, agency, phone number, or email appears here.

import type { PropertyVisualType } from "@/components/demo/PropertyVisual";

export type DemoProject = {
  name: string;
  type: string;
  city: string;
  priceIndicative: string;
  deliveryIndicative: string;
  visual: PropertyVisualType;
};

export const DEMO_PROMOTER = {
  name: "Promoteur Démo Casablanca",
  zones: ["Casablanca", "Bouskoura", "Dar Bouazza"],
  projects: [
    {
      name: "Résidence Palmier Démo",
      type: "Appartements",
      city: "Casablanca",
      priceIndicative: "à partir de 850 000 DH (indicatif fictif)",
      deliveryIndicative: "Livraison indicative : 2027 (fictif)",
      visual: "project-garden",
    },
    {
      name: "Les Jardins Anfa Démo",
      type: "Appartements & duplex",
      city: "Casablanca",
      priceIndicative: "à partir de 1 200 000 DH (indicatif fictif)",
      deliveryIndicative: "Livraison indicative : 2028 (fictif)",
      visual: "project-facade",
    },
    {
      name: "Horizon Bouskoura Démo",
      type: "Villas",
      city: "Bouskoura",
      priceIndicative: "à partir de 2 100 000 DH (indicatif fictif)",
      deliveryIndicative: "Livraison indicative : 2027 (fictif)",
      visual: "villa-premium",
    },
  ] as DemoProject[],
  report: {
    searchesReceived: 128,
    sourceClicks: 46,
    infoRequests: 12,
    topNeighborhoods: ["Bouskoura Centre", "Anfa", "Dar Bouazza Nord"],
  },
};

export type DemoListing = {
  title: string;
  type: string;
  city: string;
  neighborhood: string;
  priceIndicative: string;
  visual: PropertyVisualType;
};

export const DEMO_AGENCY = {
  name: "Agence Démo Rabat",
  specialties: ["Location longue durée", "Achat familial", "MRE", "Villa / Appartement"],
  zones: ["Rabat", "Agdal", "Hay Riad", "Souissi"],
  listings: [
    { title: "Appartement 3 chambres — Exemple", type: "Appartement", city: "Rabat", neighborhood: "Agdal", priceIndicative: "9 500 DH/mois (exemple)", visual: "appartement-familial" },
    { title: "Villa avec jardin — Exemple", type: "Villa", city: "Rabat", neighborhood: "Souissi", priceIndicative: "3 200 000 DH (exemple)", visual: "villa-premium" },
    { title: "Duplex standing — Exemple", type: "Duplex", city: "Rabat", neighborhood: "Hay Riad", priceIndicative: "2 400 000 DH (exemple)", visual: "urban-building" },
    { title: "Appartement meublé — Exemple", type: "Appartement", city: "Rabat", neighborhood: "Agdal", priceIndicative: "7 800 DH/mois (exemple)", visual: "studio-urbain" },
  ] as DemoListing[],
  performance: {
    requestsReceived: 64,
    associatedSearches: 310,
    topZones: ["Agdal", "Hay Riad", "Souissi"],
  },
};

export const DEMO_BUYER_PROFILES = [
  { label: "Famille", detail: "3 chambres, proche écoles, budget maîtrisé" },
  { label: "MRE", detail: "achat à distance, dossier préparé avant le voyage" },
  { label: "Investisseur", detail: "rendement locatif, zones à fort potentiel" },
];

export const DEMO_RENTER_NEEDS = {
  budget: "6 000 – 9 000 DH/mois (exemple)",
  city: "Casablanca (exemple)",
  neighborhood: "Maârif ou Racine (exemple)",
  surface: "60 – 90 m² (exemple)",
};

export const DEMO_POPULAR_RENT_ZONES = [
  { city: "Casablanca", neighborhood: "Maârif" },
  { city: "Rabat", neighborhood: "Agdal" },
  { city: "Marrakech", neighborhood: "Guéliz" },
];

export const DEMO_SELLER_FORM_DEFAULTS = {
  city: "Casablanca (exemple)",
  neighborhood: "Racine (exemple)",
  type: "Appartement (exemple)",
  surface: "95 m² (exemple)",
  horizon: "3 à 6 mois (exemple)",
};

export const DEMO_CONTACT_EMAIL = "demo@akarfinder.ma";

// ZILLOW-LIKE-PROPERTY-DETAIL-DEMO-1 — fictional, richly detailed property
// page. UX pattern inspiration only (gallery, specs, proximity, mobility,
// neighborhood read, timeline, pre-contact checklist) — no copied text, no
// borrowed score names, no real data. Everything here is illustrative.

export const DEMO_PROPERTY_DETAIL = {
  title: "Appartement Démo — Racine, Casablanca",
  city: "Casablanca",
  district: "Racine",
  priceLabel: "2 450 000 MAD (indicatif fictif)",
  specs: [
    { label: "Type", value: "Appartement (fictif)" },
    { label: "Surface", value: "118 m² (fictif)" },
    { label: "Chambres", value: "3 (fictif)" },
    { label: "Salles de bain", value: "2 (fictif)" },
    { label: "Étage", value: "4ème étage (fictif)" },
    { label: "Orientation", value: "Sud-Est (fictif)" },
    { label: "Ascenseur", value: "Oui (fictif)" },
    { label: "Parking", value: "1 place (fictif)" },
    { label: "Terrasse", value: "Balcon (fictif)" },
    { label: "État général", value: "Bon état (fictif)" },
  ],
  galleryImages: [
    "/demo/properties/gallery/apartment-modern-entree.jpg",
    "/demo/properties/gallery/apartment-modern-salon.jpg",
    "/demo/properties/gallery/apartment-modern-balcon.jpg",
  ],
  proximityScores: [
    {
      key: "daily",
      label: "Proximité quotidienne",
      score: 86,
      tag: "Très pratique au quotidien",
      criteria: ["Commerces", "Cafés", "Pharmacie", "Banque", "Supermarché"],
    },
    {
      key: "mobility",
      label: "Mobilité",
      score: 78,
      tag: "Déplacements faciles",
      criteria: ["Tram", "Taxi", "Grands axes", "Gare", "Parking"],
    },
    {
      key: "family",
      label: "Famille & services",
      score: 74,
      tag: "Services utiles dans le secteur",
      criteria: ["Écoles", "Crèches", "Cliniques", "Espaces verts"],
    },
    {
      key: "calm",
      label: "Calme relatif",
      score: 62,
      tag: "À confirmer selon rue exacte",
      criteria: ["Axe passant", "Bruit", "Stationnement", "Densité commerciale"],
    },
  ],
  nearbyPlaces: [
    { category: "Transports", items: ["Tramway — dans le secteur (fictif)", "Station de taxi — à proximité (fictif)"] },
    { category: "Écoles & crèches", items: ["École privée — à confirmer (fictif)", "Crèche — dans le quartier (fictif)"] },
    { category: "Santé", items: ["Clinique — secteur élargi (fictif)", "Pharmacie — proche (fictif)"] },
    { category: "Commerces", items: ["Supermarché — dans le secteur (fictif)", "Épicerie — à proximité (fictif)"] },
    { category: "Loisirs", items: ["Café / restaurant — dans le quartier (fictif)"] },
    { category: "Lieux de vie", items: ["Espace vert — à quelques minutes (fictif)"] },
  ],
  mobility: [
    { mode: "Voiture", note: "Accès rapide aux grands axes (fictif)" },
    { mode: "Tram", note: "Station dans le secteur (fictif)" },
    { mode: "Taxi", note: "Disponibilité fréquente (fictif)" },
    { mode: "Marche", note: "Services courants accessibles (fictif)" },
    { mode: "Stationnement", note: "Variable selon rue — à vérifier" },
  ],
  neighborhoodRead: [
    "Quartier central",
    "Commerces, bureaux et restaurants",
    "Circulation variable selon les heures",
    "Stationnement à vérifier selon la rue",
    "Proximité indicative de Maârif, Anfa et Gauthier",
  ],
  timeline: [
    { label: "Ajouté à la démonstration", value: "Juin 2026" },
    { label: "Prix affiché démo", value: "2 450 000 MAD" },
    { label: "Mise à jour fictive", value: "+ photos démo" },
    { label: "Statut", value: "Exemple non contractuel" },
  ],
  verificationChecklist: [
    "Titre foncier",
    "Charges de copropriété",
    "Syndic",
    "Stationnement réel",
    "État des parties communes",
    "Voisinage",
    "Orientation",
    "Bruit",
    "Conformité de la surface",
    "Frais d'agence éventuels",
  ],
};

// NEIGHBORHOOD-EXPERIENCE-SHOWCASE-1 — fictional, non-contractual
// "neighborhood experience" data. Everything here is illustrative: no
// precise travel times, no official estimate, no reliability score.
// Presented strictly as an example of what AkarFinder's neighborhood
// reading could look like once populated with real, sourced information.

export type DemoMarketPositionLabel =
  | "Position relative inférieure"
  | "Position relative proche"
  | "Position relative supérieure"
  | "Fortement au-dessus"
  | "Données insuffisantes";

export type DemoInfoLevel = "Information complète" | "Information partielle" | "Information limitée" | "À compléter";

export const DEMO_NEIGHBORHOOD_PROFILE = {
  surroundings: [
    { icon: "shop" as const, label: "Commerces dans le secteur" },
    { icon: "school" as const, label: "Écoles à proximité" },
    { icon: "road" as const, label: "Accès rapide aux axes principaux" },
    { icon: "tree" as const, label: "Espaces verts dans le secteur" },
    { icon: "bus" as const, label: "Transports en commun repérés à proximité" },
  ],
  sectorTags: ["Résidentiel", "Familial", "Calme", "Proche services"],
  sectorNote:
    "Cet aperçu illustre comment AkarFinder peut aider à mieux lire l'environnement d'un bien. Les données affichées ici sont fictives et non contractuelles.",
  marketPosition: {
    label: "Position relative proche" as DemoMarketPositionLabel,
    note: "Repère prix indicatif — exemple de lecture marché, repère non contractuel.",
  },
  infoLevel: {
    level: "Information complète" as DemoInfoLevel,
    checks: [
      { label: "Prix", present: true },
      { label: "Surface", present: true },
      { label: "Quartier renseigné", present: true },
      { label: "Photos", present: true },
      { label: "Description", present: true },
      { label: "Source publique mentionnée", present: true },
    ],
  },
};

export const DEMO_RENTAL_NEIGHBORHOOD_PROFILE = {
  ...DEMO_NEIGHBORHOOD_PROFILE,
  sectorTags: ["Urbain", "Dynamique", "Proche services", "Bien desservi"],
  marketPosition: {
    label: "Position relative inférieure" as DemoMarketPositionLabel,
    note: "Repère prix indicatif — exemple de lecture marché, repère non contractuel.",
  },
  infoLevel: {
    level: "Information partielle" as DemoInfoLevel,
    checks: [
      { label: "Prix", present: true },
      { label: "Surface", present: true },
      { label: "Quartier renseigné", present: true },
      { label: "Photos", present: false },
      { label: "Description", present: true },
      { label: "Source publique mentionnée", present: true },
    ],
  },
};

export const DEMO_PROMOTER_NEIGHBORHOOD = {
  surroundings: [
    { icon: "shop" as const, label: "Commerces et services prévus dans le secteur" },
    { icon: "road" as const, label: "Accès rapide aux axes principaux" },
    { icon: "bus" as const, label: "Mobilité : desserte repérée à proximité" },
    { icon: "tree" as const, label: "Espaces verts dans l'environnement du projet" },
  ],
  sectorTags: ["Résidentiel", "En développement", "Familial"],
  sectorNote:
    "Cet aperçu illustre comment AkarFinder peut présenter l'environnement d'un projet neuf. Les données affichées ici sont fictives et non contractuelles.",
  positioning: "Positionnement indicatif pour un projet neuf en secteur résidentiel — exemple de lecture, repère non contractuel.",
  targetAudience: ["Famille", "MRE", "Investissement", "Primo-accédant"],
};
