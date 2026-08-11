import { NEIGHBORHOOD_VISUAL_TEMPLATE_A } from "./neighborhood-visual-template-a";

const COMMONS_FILE_REDIRECT = "https://commons.wikimedia.org/wiki/Special:Redirect/file/";
const COMMONS_WIKI = "https://commons.wikimedia.org/wiki/";

function encodeCommonsTitle(value: string): string {
  return encodeURIComponent(value.replace(/ /g, "_")).replace(/'/g, "%27");
}

const FILE_NAME = "Avenue Mohamed VI Souissi Rabat -1.jpg";

export const SOUISSI_SIGNATURE_VISUAL = {
  id: "rabat-souissi-signature-v1",
  templateId: NEIGHBORHOOD_VISUAL_TEMPLATE_A.id,
  city: "Rabat",
  neighborhood: "Souissi",
  sceneRole: "signature",
  title: "SOUISSI",
  cityLabel: "Rabat",
  descriptors: ["Résidentiel", "Verdoyant", "Faible densité"] as const,
  source: {
    fileName: FILE_NAME,
    asset: `${COMMONS_FILE_REDIRECT}${encodeCommonsTitle(FILE_NAME)}?width=1600`,
    sourcePage: `${COMMONS_WIKI}${encodeCommonsTitle(`File:${FILE_NAME}`)}`,
    sourceName: "Wikimedia Commons",
    author: "YousraElkh9",
    license: "CC BY-SA 4.0",
    capturedAt: "2016-01-18",
    width: 3072,
    height: 1728,
    sha1: "c801e690e27a571c38d68de199824b34b925b6e4",
    geoVerified: true,
    location: "Avenue Mohammed VI, Souissi, Rabat, Morocco",
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
    reason: "P0.3 prepares the signature asset contract; Search activation is gated by P0.6 visual QA.",
  },
} as const;

export type SouissiSignatureVisual = typeof SOUISSI_SIGNATURE_VISUAL;
