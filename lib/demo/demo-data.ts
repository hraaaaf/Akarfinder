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
      visual: "apartment-modern",
    },
    {
      name: "Les Jardins Anfa Démo",
      type: "Appartements & duplex",
      city: "Casablanca",
      priceIndicative: "à partir de 1 200 000 DH (indicatif fictif)",
      deliveryIndicative: "Livraison indicative : 2028 (fictif)",
      visual: "residence-neuve",
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
    { title: "Duplex standing — Exemple", type: "Duplex", city: "Rabat", neighborhood: "Hay Riad", priceIndicative: "2 400 000 DH (exemple)", visual: "residence-neuve" },
    { title: "Appartement meublé — Exemple", type: "Appartement", city: "Rabat", neighborhood: "Agdal", priceIndicative: "7 800 DH/mois (exemple)", visual: "apartment-modern" },
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
