import { NEIGHBORHOOD_VISUAL_TEMPLATE_A } from "./neighborhood-visual-template-a";

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
    reason: "P1.3 certifies the Aviation library; generalized neighborhood Search resolution remains gated by P2.",
  },
} as const;

export const AVIATION_SIGNATURE_VISUAL = {
  ...common,
  id: "rabat-aviation-signature-v1",
  sceneRole: "signature",
  semanticRole: "quartier_signature",
  descriptors: ["Repère", "Jardins", "Aviation"] as const,
  source: {
    fileName: "Sofitel Rabat.jpg",
    asset: "/neighborhood-visuals/rabat/aviation/signature/sofitel-rabat.jpg",
    sourcePage: "https://commons.wikimedia.org/wiki/File:Sofitel_Rabat.jpg",
    sourceName: "Wikimedia Commons",
    sourceKind: "open_license" as const,
    author: "Zainabade",
    license: "CC BY-SA 4.0",
    rightsBasis: "cc_by_sa_4_0" as const,
    rightsNote: "Reuse and modification allowed with attribution and ShareAlike.",
    width: 2560,
    height: 1440,
    bytes: 621_270,
    sha1: "9301a9696cbe7a420951f7179d12c755a6492610",
    locationVerified: true,
    location: "Sofitel Rabat Jardin des Roses, Quartier Aviation, Rabat",
    locationEvidence: "The source identifies Sofitel Rabat; independent address evidence places the hotel on Avenue Imam Malik in Quartier Aviation, Rabat.",
    locationEvidenceUrl: "https://www.tripadvisor.com/Hotel_Review-g293736-d301517-Reviews-Sofitel_Rabat_Jardin_Des_Roses-Rabat_Rabat_Sale_Kenitra.html",
  },
  truthBoundary: {
    depictsSpecificProperty: false,
    claimPropertyForSale: false,
    allowedMeaning: "Recognizable landscaped landmark associated with Quartier Aviation only",
  },
} as const;

export const AVIATION_IMMOBILIER_VISUAL = {
  ...common,
  id: "rabat-aviation-immobilier-v1",
  sceneRole: "immobilier",
  semanticRole: "trame_urbaine",
  descriptors: ["Résidentiel", "Verdoyant", "Grands axes"] as const,
  source: {
    fileName: "Avenue Mohamed VI Souissi Rabat.jpg",
    asset: "/neighborhood-visuals/rabat/aviation/immobilier/avenue-mohamed-vi.jpg",
    sourcePage: "https://commons.wikimedia.org/wiki/File:Avenue_Mohamed_VI_Souissi_Rabat.jpg",
    sourceName: "Wikimedia Commons",
    sourceKind: "open_license" as const,
    author: "YousraElkh9",
    license: "CC BY-SA 4.0",
    rightsBasis: "cc_by_sa_4_0" as const,
    rightsNote: "Reuse and modification allowed with attribution and ShareAlike.",
    width: 3072,
    height: 1728,
    bytes: 1_338_653,
    sha1: "d8e09bfdbad2fdef60f28840b90b79b45f77b8c6",
    locationVerified: true,
    location: "Avenue Mohammed VI, Rabat — Aviation/Souissi urban edge",
    locationEvidence: "The Commons file explicitly identifies Avenue Mohammed VI in Souissi, Rabat. Aviation is documented immediately across this major axis; the image is used only for the shared green boulevard morphology, never as proof of a specific property inside Aviation.",
    locationEvidenceUrl: "https://commons.wikimedia.org/wiki/File:Avenue_Mohamed_VI_Souissi_Rabat.jpg",
  },
  truthBoundary: {
    depictsSpecificProperty: false,
    claimApartment: false,
    claimVilla: false,
    claimPropertyForSale: false,
    allowedMeaning: "Representative green boulevard morphology on the Aviation/Souissi edge only",
  },
} as const;

export const AVIATION_LIFESTYLE_VISUAL = {
  ...common,
  id: "rabat-aviation-lifestyle-v1",
  sceneRole: "lifestyle",
  semanticRole: "cadre_de_vie_public",
  descriptors: ["Vie locale", "Mobilité", "Avenue Souss"] as const,
  source: {
    fileName: "KartaView photo 260184419",
    asset: "/neighborhood-visuals/rabat/aviation/lifestyle/kartaview-260184419.jpg",
    sourcePage: "https://api.openstreetcam.org/2.0/photo/?id=260184419",
    sourceName: "KartaView",
    sourceKind: "open_license" as const,
    author: "© Grab and KartaView Contributors",
    license: "CC BY-SA 4.0",
    rightsBasis: "cc_by_sa_4_0" as const,
    rightsNote: "KartaView street imagery is reused under CC BY-SA 4.0; certified bytes are pinned in-repo.",
    capturedAt: "2018-06-06 08:48:20",
    width: 1280,
    height: 720,
    bytes: 292_304,
    sha1: "3bfd758bb1bc62a0b9598de68f5940932a898eb7",
    locationVerified: true,
    location: "Aviation / Avenue Souss area, Rabat (34.020405, -6.834417)",
    locationEvidence: "KartaView photo 260184419, sequence 1224667, is geotagged at 34.020405, -6.834417 with heading 235° inside the verified Aviation / Avenue Souss search area.",
    locationEvidenceUrl: "https://api.openstreetcam.org/2.0/photo/?id=260184419",
  },
  truthBoundary: {
    depictsSpecificProperty: false,
    claimPrivateAmenity: false,
    claimPropertyForSale: false,
    allowedMeaning: "Public street-life and mobility context of Aviation only",
  },
} as const;

export const AVIATION_NEIGHBORHOOD_VISUALS = [
  AVIATION_SIGNATURE_VISUAL,
  AVIATION_IMMOBILIER_VISUAL,
  AVIATION_LIFESTYLE_VISUAL,
] as const;

export type AviationNeighborhoodVisual = (typeof AVIATION_NEIGHBORHOOD_VISUALS)[number];
