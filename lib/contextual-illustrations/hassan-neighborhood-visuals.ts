import { NEIGHBORHOOD_VISUAL_TEMPLATE_A } from "./neighborhood-visual-template-a";

const COMMONS_REDIRECT = "https://commons.wikimedia.org/wiki/Special:Redirect/file/";
const COMMONS_WIKI = "https://commons.wikimedia.org/wiki/File:";
const enc = (value: string) => encodeURIComponent(value.replace(/ /g, "_"));

function commonsSource(details: {
  fileName: string;
  author: string;
  license: "CC BY-SA 4.0" | "CC BY-SA 3.0";
  rightsBasis: "cc_by_sa_4_0" | "cc_by_sa_3_0";
  width: number;
  height: number;
  bytes: number;
  sha1: string;
  location: string;
  locationEvidence: string;
}) {
  return {
    fileName: details.fileName,
    asset: `${COMMONS_REDIRECT}${enc(details.fileName)}`,
    sourcePage: `${COMMONS_WIKI}${enc(details.fileName)}`,
    sourceName: "Wikimedia Commons",
    sourceKind: "open_license" as const,
    author: details.author,
    license: details.license,
    rightsBasis: details.rightsBasis,
    rightsNote: "Reuse and modification allowed with attribution and ShareAlike under the source license.",
    width: details.width,
    height: details.height,
    bytes: details.bytes,
    sha1: details.sha1,
    locationVerified: true,
    location: details.location,
    locationEvidence: details.locationEvidence,
    relationshipToNeighborhood: "inside_context" as const,
  } as const;
}

const common = {
  templateId: NEIGHBORHOOD_VISUAL_TEMPLATE_A.id,
  city: "Rabat",
  neighborhood: "Hassan",
  title: "HASSAN",
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
    reason: "P1.4 certifies the Hassan visual library; generalized neighborhood Search resolution remains gated by P2.",
  },
} as const;

export const HASSAN_SIGNATURE_VISUAL = {
  ...common,
  id: "rabat-hassan-signature-v1",
  sceneRole: "signature",
  semanticRole: "quartier_signature",
  descriptors: ["Tour Hassan", "Patrimoine", "Esplanade"] as const,
  source: commonsSource({
    fileName: "نافورة صومعة حسان.jpg",
    author: "Hossam.essaadi.1",
    license: "CC BY-SA 4.0",
    rightsBasis: "cc_by_sa_4_0",
    width: 5184,
    height: 3456,
    bytes: 8_754_722,
    sha1: "6522403ac6ec1bf56276a8aa5794693a66aa7c08",
    location: "Hassan Tower plaza, Rabat (34.023864, -6.822656)",
    locationEvidence: "Wikimedia Commons object location explicitly places the fountain on Hassan Tower plaza at 34.023864,-6.822656.",
  }),
  truthBoundary: {
    depictsSpecificProperty: false,
    claimPropertyForSale: false,
    allowedMeaning: "Recognizable Hassan neighborhood landmark and public-space identity only",
  },
} as const;

export const HASSAN_IMMOBILIER_VISUAL = {
  ...common,
  id: "rabat-hassan-immobilier-v1",
  sceneRole: "immobilier",
  semanticRole: "trame_urbaine",
  descriptors: ["Central", "Urbain", "Vue quartier"] as const,
  source: commonsSource({
    fileName: "View-of-Rabat-from-Hassan-Tower.jpg",
    author: "Steven C. Price",
    license: "CC BY-SA 4.0",
    rightsBasis: "cc_by_sa_4_0",
    width: 3456,
    height: 2304,
    bytes: 2_877_341,
    sha1: "ffc30f2a48e055403880d933e29e16a853986e3e",
    location: "View of Rabat from Hassan Tower plaza, Hassan, Rabat",
    locationEvidence: "The Commons source description explicitly states that the photograph is a view of Rabat from Hassan Tower plaza; it is used only for neighborhood urban morphology, never as a specific property claim.",
  }),
  truthBoundary: {
    depictsSpecificProperty: false,
    claimApartment: false,
    claimVilla: false,
    claimPropertyForSale: false,
    allowedMeaning: "Urban morphology visible from Hassan Tower plaza only",
  },
} as const;

export const HASSAN_LIFESTYLE_VISUAL = {
  ...common,
  id: "rabat-hassan-lifestyle-v1",
  sceneRole: "lifestyle",
  semanticRole: "cadre_de_vie_public",
  descriptors: ["Vie locale", "Patrimoine", "Promenade"] as const,
  source: commonsSource({
    fileName: "Quartier Hassan, Rabat, Morocco - panoramio (1).jpg",
    author: "Ben Bender",
    license: "CC BY-SA 3.0",
    rightsBasis: "cc_by_sa_3_0",
    width: 1375,
    height: 2048,
    bytes: 365_717,
    sha1: "fe36362031f75d1835931f46e15f8e43dccc4a7c",
    location: "Quartier Hassan, Rabat (34.021671, -6.822780)",
    locationEvidence: "The Commons source is explicitly titled Quartier Hassan, Rabat, Morocco and carries camera coordinates 34.021671,-6.822780.",
  }),
  truthBoundary: {
    depictsSpecificProperty: false,
    claimPrivateAmenity: false,
    claimPropertyForSale: false,
    allowedMeaning: "Public lifestyle and pedestrian context inside Quartier Hassan only",
  },
} as const;

export const HASSAN_NEIGHBORHOOD_VISUALS = [
  HASSAN_SIGNATURE_VISUAL,
  HASSAN_IMMOBILIER_VISUAL,
  HASSAN_LIFESTYLE_VISUAL,
] as const;

export type HassanNeighborhoodVisual = (typeof HASSAN_NEIGHBORHOOD_VISUALS)[number];
