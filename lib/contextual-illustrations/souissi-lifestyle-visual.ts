import { NEIGHBORHOOD_VISUAL_TEMPLATE_A } from "./neighborhood-visual-template-a";

const COMMONS_FILE_REDIRECT = "https://commons.wikimedia.org/wiki/Special:Redirect/file/";
const COMMONS_WIKI = "https://commons.wikimedia.org/wiki/";

function encodeCommonsTitle(value: string): string {
  return encodeURIComponent(value.replace(/ /g, "_")).replace(/'/g, "%27");
}

const FILE_NAME = "Hassan II Park - Rabat - November 2024 - 1.jpg";

export const SOUISSI_LIFESTYLE_VISUAL = {
  id: "rabat-souissi-lifestyle-v1",
  templateId: NEIGHBORHOOD_VISUAL_TEMPLATE_A.id,
  city: "Rabat",
  neighborhood: "Souissi",
  sceneRole: "lifestyle",
  title: "SOUISSI",
  cityLabel: "Rabat",
  descriptors: ["Verdure", "Calme", "Espaces ouverts"] as const,
  semanticRole: "cadre_de_vie",
  source: {
    fileName: FILE_NAME,
    asset: `${COMMONS_FILE_REDIRECT}${encodeCommonsTitle(FILE_NAME)}?width=1600`,
    sourcePage: `${COMMONS_WIKI}${encodeCommonsTitle(`File:${FILE_NAME}`)}`,
    sourceName: "Wikimedia Commons",
    author: "Anass Sedrati",
    license: "CC BY-SA 4.0",
    capturedAt: "2024-11-12T12:39:37",
    width: 4032,
    height: 3024,
    locationVerified: true,
    latitude: 34.000481,
    longitude: -6.831461,
    locationEvidence: "Commons GPS metadata + Communes Documentation Project 2024 (Rabat-Souissi)",
    location: "Hassan II Park, Rabat-Souissi, Rabat, Morocco",
  },
  truthBoundary: {
    depictsSpecificProperty: false,
    claimPrivateGarden: false,
    claimPropertyAmenity: false,
    allowedMeaning: "Representative public green-space lifestyle context for Souissi only",
  },
  presentation: {
    treatment: "css_only",
    preserveSourcePixels: true,
    bakedText: false,
    overlayPlacement: "lower_left",
    disclosureLabel: NEIGHBORHOOD_VISUAL_TEMPLATE_A.composition.disclosureLabel,
  },
  activation: {
    searchEnabled: false,
    reason: "P0.5 prepares the lifestyle scene contract; Search activation is gated by P0.6 visual QA.",
  },
} as const;

export type SouissiLifestyleVisual = typeof SOUISSI_LIFESTYLE_VISUAL;
