import { NEIGHBORHOOD_VISUAL_TEMPLATE_A } from "./neighborhood-visual-template-a";

const COMMONS_FILE_REDIRECT = "https://commons.wikimedia.org/wiki/Special:Redirect/file/";
const COMMONS_WIKI = "https://commons.wikimedia.org/wiki/";

function encodeCommonsTitle(value: string): string {
  return encodeURIComponent(value.replace(/ /g, "_")).replace(/'/g, "%27");
}

const FILE_NAME = "Rabat,Souissi1.jpg";

export const SOUISSI_IMMOBILIER_VISUAL = {
  id: "rabat-souissi-immobilier-v1",
  templateId: NEIGHBORHOOD_VISUAL_TEMPLATE_A.id,
  city: "Rabat",
  neighborhood: "Souissi",
  sceneRole: "immobilier",
  title: "SOUISSI",
  cityLabel: "Rabat",
  descriptors: ["Faible densité", "Grandes emprises", "Bâti bas"] as const,
  semanticRole: "morphologie_batie",
  source: {
    fileName: FILE_NAME,
    asset: `${COMMONS_FILE_REDIRECT}${encodeCommonsTitle(FILE_NAME)}?width=1600`,
    sourcePage: `${COMMONS_WIKI}${encodeCommonsTitle(`File:${FILE_NAME}`)}`,
    sourceName: "Wikimedia Commons",
    author: "Bertramz",
    license: "CC BY-SA 3.0",
    capturedAt: "2010-09",
    width: 1440,
    height: 964,
    locationVerified: true,
    locationEvidence: "Commons description: Rabat, Souissi embassy quarter",
    location: "Souissi embassy quarter, Rabat, Morocco",
  },
  truthBoundary: {
    depictsSpecificProperty: false,
    claimVilla: false,
    claimPropertyForSale: false,
    claimResidentialInterior: false,
    allowedMeaning: "Representative built morphology of Souissi only",
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
    reason: "P0.4 prepares the immobilier scene contract; Search activation is gated by P0.6 visual QA.",
  },
} as const;

export type SouissiImmobilierVisual = typeof SOUISSI_IMMOBILIER_VISUAL;
