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
  neighborhood: "Océan",
  title: "OCÉAN",
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
    reason: "P1.8 certifies a truthful Océan context library; generalized Search resolution remains gated by P2.",
  },
} as const;

export const OCEAN_SIGNATURE_VISUAL = {
  ...common,
  id: "rabat-ocean-signature-v1",
  sceneRole: "signature",
  semanticRole: "front_atlantique",
  descriptors: ["Atlantique", "Phare", "Front de mer"] as const,
  source: commonsSource({
    fileName: "Phare de Rabat 01.jpg",
    author: "Froh-Leïla Belfakir",
    width: 3919,
    height: 2208,
    bytes: 5_083_289,
    sha1: "561b72a1093fd4fc207e573447f9de94330e66b1",
    location: "Phare de Rabat / Borj Sirat, front atlantique de Rabat",
    locationEvidence: "Commons explicitly identifies Rabat Lighthouse on Borj Sirat above the Atlantic. Used strictly as nearby waterfront identity for Océan, never as an inside-neighborhood property claim.",
    relationship: "nearby_context",
  }),
  truthBoundary: {
    depictsSpecificProperty: false,
    claimInsideNeighborhood: false,
    claimPropertyForSale: false,
    allowedMeaning: "Nearby Atlantic waterfront identity only; never proof that the lighthouse lies inside Océan",
  },
} as const;

export const OCEAN_IMMOBILIER_VISUAL = {
  ...common,
  id: "rabat-ocean-immobilier-v1",
  sceneRole: "immobilier",
  semanticRole: "lisiere_bab_el_had",
  descriptors: ["Urbain", "Patrimoine", "Lisière"] as const,
  source: commonsSource({
    fileName: "Bab El Had (46314).jpg",
    author: "RACHID BAYA",
    width: 4000,
    height: 3000,
    bytes: 4_207_608,
    sha1: "33bc545195a8ba9904e9b68519cf2c4714af11b7",
    location: "Bab El Had, Rabat (34.021865, -6.840533)",
    locationEvidence: "Commons geotag verifies Bab El Had. Rabat Région Mobilité/MAP documents Rue Bruxelles in the heart of quartier Océan as being near Bab El Had. Used only as edge morphology. Physical JPEG is 4000×3000 with EXIF rotation; Commons displays 3000×4000.",
    relationship: "edge_context",
  }),
  truthBoundary: {
    depictsSpecificProperty: false,
    claimInsideNeighborhood: false,
    claimPropertyForSale: false,
    allowedMeaning: "Urban and heritage morphology on the Bab El Had edge of Océan only",
  },
} as const;

export const OCEAN_LIFESTYLE_VISUAL = {
  ...common,
  id: "rabat-ocean-lifestyle-v1",
  sceneRole: "lifestyle",
  semanticRole: "coucher_de_soleil_atlantique",
  descriptors: ["Coucher de soleil", "Océan", "Rabat"] as const,
  source: commonsSource({
    fileName: "Coucher de soleil à quartier l'Océan.JPG",
    author: "Etotheraf",
    width: 2592,
    height: 1936,
    bytes: 1_644_663,
    sha1: "ec76f6f5f505a30bafc32810158e7bc014eb4983",
    location: "À côté du quartier l'Océan, Rabat",
    locationEvidence: "Commons description explicitly states that the sunset was photographed next to quartier l'Océan, Rabat.",
    relationship: "nearby_context",
  }),
  truthBoundary: {
    depictsSpecificProperty: false,
    claimInsideNeighborhood: false,
    claimPrivateAmenity: false,
    claimPropertyForSale: false,
    allowedMeaning: "Nearby Atlantic lifestyle context explicitly associated with quartier l'Océan",
  },
} as const;

export const OCEAN_NEIGHBORHOOD_VISUALS = [
  OCEAN_SIGNATURE_VISUAL,
  OCEAN_IMMOBILIER_VISUAL,
  OCEAN_LIFESTYLE_VISUAL,
] as const;

export type OceanNeighborhoodVisual = (typeof OCEAN_NEIGHBORHOOD_VISUALS)[number];
