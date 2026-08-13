import { NEIGHBORHOOD_VISUAL_TEMPLATE_A } from "./neighborhood-visual-template-a";

const COMMONS_REDIRECT = "https://commons.wikimedia.org/wiki/Special:Redirect/file/";
const COMMONS_WIKI = "https://commons.wikimedia.org/wiki/File:";
const enc = (value: string) => encodeURIComponent(value.replace(/ /g, "_"));

function commonsSource(details: { fileName: string; author: string; license: "CC BY-SA 4.0" | "CC BY 2.0"; width: number; height: number; bytes: number; sha1: string; location: string; locationEvidence: string; }) {
  return {
    fileName: details.fileName,
    asset: `${COMMONS_REDIRECT}${enc(details.fileName)}`,
    sourcePage: `${COMMONS_WIKI}${enc(details.fileName)}`,
    sourceName: "Wikimedia Commons",
    sourceKind: "open_license" as const,
    author: details.author,
    license: details.license,
    rightsBasis: details.license === "CC BY-SA 4.0" ? "cc_by_sa_4_0" as const : "cc_by_2_0" as const,
    rightsNote: details.license === "CC BY-SA 4.0" ? "Reuse and modification allowed with attribution and ShareAlike." : "Reuse and modification allowed with attribution.",
    width: details.width, height: details.height, bytes: details.bytes, sha1: details.sha1,
    locationVerified: true,
    location: details.location,
    locationEvidence: details.locationEvidence,
  } as const;
}

const common = {
  templateId: NEIGHBORHOOD_VISUAL_TEMPLATE_A.id,
  city: "Rabat",
  neighborhood: "Hay Riad",
  title: "HAY RIAD",
  cityLabel: "Rabat",
  presentation: { treatment: "css_only", preserveSourcePixels: true, bakedText: false, overlayPlacement: "lower_left", disclosureLabel: NEIGHBORHOOD_VISUAL_TEMPLATE_A.composition.disclosureLabel },
  activation: { searchEnabled: false, reason: "P1.5 certifies Hay Riad visuals; generalized Search resolution remains gated by P2." },
} as const;

export const HAY_RIAD_SIGNATURE_VISUAL = {
  ...common,
  id: "rabat-hay-riad-signature-v1",
  sceneRole: "signature",
  semanticRole: "repere_quartier",
  descriptors: ["Résidentiel", "Verdoyant", "Hay Riad"] as const,
  source: commonsSource({
    fileName: "Rabat hay ryad.jpg", author: "Mohammed.salhi", license: "CC BY-SA 4.0",
    width: 3251, height: 4338, bytes: 6_395_398, sha1: "f02d4795b4df3c7cd6608472b82f9fda1c5d4796",
    location: "Hay Riad, Rabat (33.952591, -6.871639)",
    locationEvidence: "Commons camera location 33.952591,-6.871639; source description explicitly states Hay ryad.",
  }),
  truthBoundary: { depictsSpecificProperty: false, claimPropertyForSale: false, allowedMeaning: "Hay Riad neighborhood landmark and residential context only" },
} as const;

export const HAY_RIAD_IMMOBILIER_VISUAL = {
  ...common,
  id: "rabat-hay-riad-immobilier-v1",
  sceneRole: "immobilier",
  semanticRole: "villa_residentielle",
  descriptors: ["Villa", "Végétation", "Résidentiel"] as const,
  source: commonsSource({
    fileName: "Hay Riad (335665610).jpg", author: "Ninara", license: "CC BY 2.0",
    width: 3456, height: 2304, bytes: 4_353_803, sha1: "54c45f4914839a1a9ee3a65acf3d570f3450b653",
    location: "Villa Narjis, Hay Riad, Rabat",
    locationEvidence: "Commons description explicitly states ‘Villa Narjis in Hay Riad, Rabat, our home 1989-1992’. Used only as neighborhood housing morphology, never as a current listing.",
  }),
  truthBoundary: { depictsSpecificProperty: true, claimPropertyForSale: false, claimCurrentAvailability: false, allowedMeaning: "Historic Hay Riad villa morphology only; not an available property" },
} as const;

export const HAY_RIAD_LIFESTYLE_VISUAL = {
  ...common,
  id: "rabat-hay-riad-lifestyle-v1",
  sceneRole: "lifestyle",
  semanticRole: "rue_residentielle",
  descriptors: ["Calme", "Rue arborée", "Habitat"] as const,
  source: commonsSource({
    fileName: "Hay Riad (335665617).jpg", author: "Ninara", license: "CC BY 2.0",
    width: 2800, height: 1866, bytes: 921_974, sha1: "a91237d667511ed212e9c46b343d96cff5054c5f",
    location: "Hay Riad, Rabat",
    locationEvidence: "Commons description explicitly states Hay Riad, Rabat; source was Flickr-reviewed for CC BY 2.0.",
  }),
  truthBoundary: { depictsSpecificProperty: false, claimPropertyForSale: false, allowedMeaning: "Hay Riad public street and residential atmosphere only" },
} as const;

export const HAY_RIAD_NEIGHBORHOOD_VISUALS = [HAY_RIAD_SIGNATURE_VISUAL, HAY_RIAD_IMMOBILIER_VISUAL, HAY_RIAD_LIFESTYLE_VISUAL] as const;
export type HayRiadNeighborhoodVisual = (typeof HAY_RIAD_NEIGHBORHOOD_VISUALS)[number];
