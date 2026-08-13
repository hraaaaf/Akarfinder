import { NEIGHBORHOOD_VISUAL_TEMPLATE_A } from "./neighborhood-visual-template-a";

const COMMONS_REDIRECT = "https://commons.wikimedia.org/wiki/Special:Redirect/file/";
const COMMONS_WIKI = "https://commons.wikimedia.org/wiki/File:";
const KARTAVIEW_CREDIT = "© Grab and KartaView Contributors";
const enc = (value: string) => encodeURIComponent(value.replace(/ /g, "_"));

const common = {
  templateId: NEIGHBORHOOD_VISUAL_TEMPLATE_A.id,
  city: "Rabat",
  neighborhood: "Les Orangers",
  title: "LES ORANGERS",
  cityLabel: "Rabat",
  presentation: { treatment: "css_only", preserveSourcePixels: true, bakedText: false, overlayPlacement: "lower_left", disclosureLabel: NEIGHBORHOOD_VISUAL_TEMPLATE_A.composition.disclosureLabel },
  activation: { searchEnabled: false, reason: "P1.6 certifies Les Orangers visuals; generalized Search resolution remains gated by P2." },
} as const;

export const LES_ORANGERS_SIGNATURE_VISUAL = {
  ...common,
  id: "rabat-les-orangers-signature-v1",
  sceneRole: "signature",
  semanticRole: "quartier_verdoyant",
  descriptors: ["Verdure", "Promenade", "Quartier"] as const,
  source: {
    fileName: "Quartier Des Orangers, Rabat, Morocco - panoramio.jpg",
    asset: `${COMMONS_REDIRECT}${enc("Quartier Des Orangers, Rabat, Morocco - panoramio.jpg")}`,
    sourcePage: `${COMMONS_WIKI}${enc("Quartier Des Orangers, Rabat, Morocco - panoramio.jpg")}`,
    sourceName: "Wikimedia Commons", sourceKind: "open_license" as const, author: "Ben Bender", license: "CC BY-SA 3.0", rightsBasis: "cc_by_sa_3_0" as const,
    rightsNote: "Reuse and modification allowed with attribution and ShareAlike.", width: 2048, height: 1375, bytes: 732_633, sha1: "0770e25288f7ecd3841cd246587f1ad4f1cde18c",
    locationVerified: true, location: "Quartier Des Orangers, Rabat (34.016912, -6.836610)",
    locationEvidence: "Commons camera location 34.016912,-6.836610 and source title explicitly identifies Quartier Des Orangers, Rabat.",
  },
  truthBoundary: { depictsSpecificProperty: false, claimPropertyForSale: false, allowedMeaning: "Public green context of Les Orangers only" },
} as const;

export const LES_ORANGERS_IMMOBILIER_VISUAL = {
  ...common,
  id: "rabat-les-orangers-immobilier-v1",
  sceneRole: "immobilier",
  semanticRole: "trame_residentielle",
  descriptors: ["Résidentiel", "Façades", "Rue"] as const,
  source: {
    fileName: "kartaview-260179395.jpg", asset: "https://storage8.openstreetcam.org/files/photo/2018/6/6/lth/1224661_946fe_14.jpg", sourcePage: "https://kartaview.org/", sourceName: "KartaView", sourceKind: "open_license" as const,
    author: KARTAVIEW_CREDIT, license: "CC BY-SA 4.0", rightsBasis: "cc_by_sa_4_0" as const, rightsNote: "KartaView imagery reused under CC BY-SA 4.0 with attribution.",
    width: 1280, height: 720, bytes: 183_593, sha1: "cb978ea2874cb2e171aee6363175c38cd08305aa", locationVerified: true,
    location: "Les Orangers, Rabat (34.016806, -6.839109)", locationEvidence: "KartaView photo 260179395, sequence 1224661, geotag 34.016806,-6.839109, heading 336°; selected from a targeted sweep around the verified Les Orangers anchor.",
  },
  truthBoundary: { depictsSpecificProperty: false, claimPropertyForSale: false, allowedMeaning: "Residential street morphology in Les Orangers; never a specific listing" },
} as const;

export const LES_ORANGERS_LIFESTYLE_VISUAL = {
  ...common,
  id: "rabat-les-orangers-lifestyle-v1",
  sceneRole: "lifestyle",
  semanticRole: "rue_urbaine",
  descriptors: ["Central", "Rue urbaine", "Mobilité"] as const,
  source: {
    fileName: "kartaview-276946287.jpg", asset: "https://storage8.openstreetcam.org/files/photo/2018/6/6/lth/1224693_63b33_74.jpg", sourcePage: "https://kartaview.org/", sourceName: "KartaView", sourceKind: "open_license" as const,
    author: KARTAVIEW_CREDIT, license: "CC BY-SA 4.0", rightsBasis: "cc_by_sa_4_0" as const, rightsNote: "KartaView imagery reused under CC BY-SA 4.0 with attribution.",
    width: 1280, height: 720, bytes: 304_750, sha1: "f24100d91a8ccd20724ce9bb0a11e03c902d4adf", locationVerified: true,
    location: "Les Orangers, Rabat (34.016899, -6.834063)", locationEvidence: "KartaView photo 276946287, sequence 1224693, geotag 34.016899,-6.834063, heading 351°; selected from a targeted sweep around the verified Les Orangers anchor.",
  },
  truthBoundary: { depictsSpecificProperty: false, claimPropertyForSale: false, allowedMeaning: "Public street and mobility context of Les Orangers only" },
} as const;

export const LES_ORANGERS_NEIGHBORHOOD_VISUALS = [LES_ORANGERS_SIGNATURE_VISUAL, LES_ORANGERS_IMMOBILIER_VISUAL, LES_ORANGERS_LIFESTYLE_VISUAL] as const;
export type LesOrangersNeighborhoodVisual = (typeof LES_ORANGERS_NEIGHBORHOOD_VISUALS)[number];
