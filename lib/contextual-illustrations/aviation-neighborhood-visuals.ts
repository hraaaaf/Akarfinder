import { NEIGHBORHOOD_VISUAL_TEMPLATE_A } from "./neighborhood-visual-template-a";

const COMMONS_REDIRECT = "https://commons.wikimedia.org/wiki/Special:Redirect/file/";
const COMMONS_WIKI = "https://commons.wikimedia.org/wiki/File:";
const enc = (value: string) => encodeURIComponent(value.replace(/ /g, "_"));

function commonsSource(details: {
  fileName: string; author: string; width: number; height: number; bytes: number; sha1: string;
  location: string; locationEvidence: string; relationship: "edge_context" | "nearby_context";
}) {
  return {
    fileName: details.fileName,
    asset: `${COMMONS_REDIRECT}${enc(details.fileName)}`,
    sourcePage: `${COMMONS_WIKI}${enc(details.fileName)}`,
    sourceName: "Wikimedia Commons",
    sourceKind: "open_license" as const,
    author: details.author,
    license: "CC BY-SA 4.0",
    rightsBasis: "cc_by_sa_4_0" as const,
    rightsNote: "Reuse and modification allowed with attribution and ShareAlike.",
    width: details.width,
    height: details.height,
    bytes: details.bytes,
    sha1: details.sha1,
    locationVerified: true,
    location: details.location,
    locationEvidence: details.locationEvidence,
    relationshipToNeighborhood: details.relationship,
  } as const;
}

const common = {
  templateId: NEIGHBORHOOD_VISUAL_TEMPLATE_A.id,
  city: "Rabat",
  neighborhood: "Aviation",
  title: "AVIATION",
  cityLabel: "Rabat",
  presentation: {
    treatment: "css_only",
    preserveSourcePixels: true,
    bakedText: false,
    overlayPlacement: "lower_left",
    disclosureLabel: NEIGHBORHOOD_VISUAL_TEMPLATE_A.composition.disclosureLabel,
  },
  activation: {
    searchEnabled: false,
    reason: "P1.3 certifies a truthful Aviation context library; generalized Search resolution remains gated by P2.",
  },
} as const;

export const AVIATION_SIGNATURE_VISUAL = {
  ...common,
  id: "rabat-aviation-signature-v1",
  sceneRole: "signature",
  semanticRole: "cadre_vert_proche",
  descriptors: ["Verdure", "Promenade", "Proximité"] as const,
  source: commonsSource({
    fileName: "Hassan II Park - Rabat - November 2024 - 1.jpg",
    author: "Anass Sedrati",
    width: 4032,
    height: 3024,
    bytes: 3_222_903,
    sha1: "93cbebc360cb7424cfb554896b968fd917d43511",
    location: "Hassan II Park, Rabat (34.000481, -6.831461)",
    locationEvidence: "Commons geotag 34.000481,-6.831461. Used only as nearby green-context imagery for Aviation; it is not represented as being inside the neighborhood.",
    relationship: "nearby_context",
  }),
  truthBoundary: {
    depictsSpecificProperty: false,
    claimInsideNeighborhood: false,
    claimPropertyForSale: false,
    allowedMeaning: "Nearby green public-space context only; never proof that the park lies inside Aviation",
  },
} as const;

export const AVIATION_IMMOBILIER_VISUAL = {
  ...common,
  id: "rabat-aviation-immobilier-v1",
  sceneRole: "immobilier",
  semanticRole: "trame_urbaine_lisiere",
  descriptors: ["Résidentiel", "Verdoyant", "Grand axe"] as const,
  source: commonsSource({
    fileName: "Avenue Mohamed VI Souissi Rabat.jpg",
    author: "YousraElkh9",
    width: 3072,
    height: 1728,
    bytes: 1_338_653,
    sha1: "d8e09bfdbad2fdef60f28840b90b79b45f77b8c6",
    location: "Avenue Mohammed VI, Souissi, Rabat — edge context for Aviation",
    locationEvidence: "Commons explicitly identifies Avenue Mohammed VI in Souissi. Aviation is documented on the adjoining urban sector; this source is used strictly as edge morphology, not as an inside-Aviation property claim.",
    relationship: "edge_context",
  }),
  truthBoundary: {
    depictsSpecificProperty: false,
    claimInsideNeighborhood: false,
    claimVilla: false,
    claimPropertyForSale: false,
    allowedMeaning: "Green boulevard morphology on the Aviation/Souissi edge only",
  },
} as const;

export const AVIATION_LIFESTYLE_VISUAL = {
  ...common,
  id: "rabat-aviation-lifestyle-v1",
  sceneRole: "lifestyle",
  semanticRole: "loisirs_proches",
  descriptors: ["Loisirs", "Espace vert", "Rabat"] as const,
  source: commonsSource({
    fileName: "Hassan II Park - Rabat - November 2024 - 2.jpg",
    author: "Anass Sedrati",
    width: 4032,
    height: 3024,
    bytes: 3_502_946,
    sha1: "88d981adf174f55cdd77a5ad7518891dd1ec951d",
    location: "Hassan II Park, Rabat (34.000528, -6.831544)",
    locationEvidence: "Commons geotag 34.000528,-6.831544. Used only as nearby public leisure context for Aviation; it is not represented as an Aviation street.",
    relationship: "nearby_context",
  }),
  truthBoundary: {
    depictsSpecificProperty: false,
    claimInsideNeighborhood: false,
    claimPrivateAmenity: false,
    claimPropertyForSale: false,
    allowedMeaning: "Nearby public leisure and greenery context only",
  },
} as const;

export const AVIATION_NEIGHBORHOOD_VISUALS = [
  AVIATION_SIGNATURE_VISUAL,
  AVIATION_IMMOBILIER_VISUAL,
  AVIATION_LIFESTYLE_VISUAL,
] as const;

export type AviationNeighborhoodVisual = (typeof AVIATION_NEIGHBORHOOD_VISUALS)[number];
