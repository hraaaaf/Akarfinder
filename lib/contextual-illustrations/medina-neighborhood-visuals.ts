import { NEIGHBORHOOD_VISUAL_TEMPLATE_A } from "./neighborhood-visual-template-a";

const COMMONS_REDIRECT = "https://commons.wikimedia.org/wiki/Special:Redirect/file/";
const COMMONS_WIKI = "https://commons.wikimedia.org/wiki/File:";
const enc = (value: string) => encodeURIComponent(value.replace(/ /g, "_"));

const common = {
  templateId: NEIGHBORHOOD_VISUAL_TEMPLATE_A.id,
  city: "Rabat",
  neighborhood: "Médina",
  title: "MÉDINA",
  cityLabel: "Rabat",
  presentation: { treatment: "css_only", preserveSourcePixels: true, bakedText: false, overlayPlacement: "lower_left", disclosureLabel: NEIGHBORHOOD_VISUAL_TEMPLATE_A.composition.disclosureLabel },
  activation: { searchEnabled: false, reason: "P1.7 certifies Médina visuals; generalized Search resolution remains gated by P2." },
} as const;

export const MEDINA_SIGNATURE_VISUAL = {
  ...common,
  id: "rabat-medina-signature-v1",
  sceneRole: "signature",
  semanticRole: "ruelle_historique",
  descriptors: ["Historique", "Remparts", "Ruelle"] as const,
  source: {
    fileName: "Old Medina of Rabat.jpg",
    asset: `${COMMONS_REDIRECT}${enc("Old Medina of Rabat.jpg")}`,
    sourcePage: `${COMMONS_WIKI}${enc("Old Medina of Rabat.jpg")}`,
    sourceName: "Wikimedia Commons", sourceKind: "open_license" as const, author: "Sara Boukhari", license: "CC BY-SA 4.0", rightsBasis: "cc_by_sa_4_0" as const,
    rightsNote: "Reuse allowed with attribution and ShareAlike.", width: 1136, height: 640, bytes: 142882, sha1: "6867e5f4d6a6891f13c167ba1a9eaaea266793ff", locationVerified: true, location: "Médina de Rabat", locationEvidence: "Commons title and description explicitly identify the Old Medina of Rabat."
  },
  truthBoundary: { depictsSpecificProperty: false, claimPropertyForSale: false, allowedMeaning: "Historic public-space identity of Rabat Médina only" },
} as const;

export const MEDINA_IMMOBILIER_VISUAL = {
  ...common,
  id: "rabat-medina-immobilier-v1",
  sceneRole: "immobilier",
  semanticRole: "architecture_medina",
  descriptors: ["Architecture", "Tradition", "Médina"] as const,
  source: {
    fileName: "Mosque in the medina of Rabat (12366658684).jpg",
    asset: `${COMMONS_REDIRECT}${enc("Mosque in the medina of Rabat (12366658684).jpg")}`,
    sourcePage: `${COMMONS_WIKI}${enc("Mosque in the medina of Rabat (12366658684).jpg")}`,
    sourceName: "Wikimedia Commons", sourceKind: "open_license" as const, author: "Dirk-Heine Hofstede", license: "CC BY-SA 2.0", rightsBasis: "cc_by_sa_2_0" as const,
    rightsNote: "Reuse allowed with attribution and ShareAlike.", width: 3906, height: 2602, bytes: 6448483, sha1: "4d41183ad3ca272837e1d668cc3433ad967a72ba", locationVerified: true, location: "Médina de Rabat", locationEvidence: "Commons description explicitly identifies a mosque in the medina of Rabat."
  },
  truthBoundary: { depictsSpecificProperty: true, claimPropertyForSale: false, allowedMeaning: "Architectural morphology of the Médina only; never a listing claim" },
} as const;

export const MEDINA_LIFESTYLE_VISUAL = {
  ...common,
  id: "rabat-medina-lifestyle-v1",
  sceneRole: "lifestyle",
  semanticRole: "souk_vie_locale",
  descriptors: ["Souk", "Vie locale", "Commerces"] as const,
  source: {
    fileName: "Market Stalls and Thatched Roof - Medina (Old City) - Rabat - Morocco.jpg",
    asset: `${COMMONS_REDIRECT}${enc("Market Stalls and Thatched Roof - Medina (Old City) - Rabat - Morocco.jpg")}`,
    sourcePage: `${COMMONS_WIKI}${enc("Market Stalls and Thatched Roof - Medina (Old City) - Rabat - Morocco.jpg")}`,
    sourceName: "Wikimedia Commons", sourceKind: "open_license" as const, author: "Adam Jones, Ph.D.", license: "CC BY-SA 3.0", rightsBasis: "cc_by_sa_3_0" as const,
    rightsNote: "Reuse allowed with attribution and ShareAlike.", width: 2304, height: 3456, bytes: 3251457, sha1: "d2a1ba64022489a7d501b6cb649d8291f1d591f2", locationVerified: true, location: "Médina de Rabat", locationEvidence: "Commons title explicitly identifies Medina (Old City), Rabat, Morocco."
  },
  truthBoundary: { depictsSpecificProperty: false, claimPropertyForSale: false, allowedMeaning: "Public market and everyday-life context of Rabat Médina only" },
} as const;

export const MEDINA_NEIGHBORHOOD_VISUALS = [MEDINA_SIGNATURE_VISUAL, MEDINA_IMMOBILIER_VISUAL, MEDINA_LIFESTYLE_VISUAL] as const;
export type MedinaNeighborhoodVisual = (typeof MEDINA_NEIGHBORHOOD_VISUALS)[number];
