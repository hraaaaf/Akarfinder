import { NEIGHBORHOOD_VISUAL_TEMPLATE_A } from "./neighborhood-visual-template-a";

const common = {
  templateId: NEIGHBORHOOD_VISUAL_TEMPLATE_A.id,
  city: "Casablanca",
  neighborhood: "Maârif",
  title: "MAÂRIF",
  cityLabel: "Casablanca",
  presentation: {
    treatment: "css_only",
    preserveSourcePixels: true,
    bakedText: false,
    overlayPlacement: "lower_left",
    disclosureLabel: NEIGHBORHOOD_VISUAL_TEMPLATE_A.composition.disclosureLabel,
  },
  activation: {
    searchEnabled: true,
    reason: "P3.1 activates only the exact normalized Casablanca / Maârif district pool after source, rights and visual QA certification.",
  },
} as const;

const commonsSource = (d: {
  fileName: string;
  asset: string;
  sourcePage: string;
  author: string;
  license: string;
  rightsBasis: "cc_by_3_0" | "cc_by_sa_2_0";
  rightsNote: string;
  width: number;
  height: number;
  bytes: number;
  sha1: string;
  locationEvidence: string;
}) => ({
  fileName: d.fileName,
  asset: d.asset,
  sourcePage: d.sourcePage,
  sourceName: "Wikimedia Commons",
  sourceKind: "open_license" as const,
  author: d.author,
  license: d.license,
  rightsBasis: d.rightsBasis,
  rightsNote: d.rightsNote,
  width: d.width,
  height: d.height,
  bytes: d.bytes,
  sha1: d.sha1,
  locationVerified: true,
  location: "Maârif, Casablanca",
  locationEvidence: d.locationEvidence,
  relationshipToNeighborhood: "nearby_context" as const,
});

export const MAARIF_SIGNATURE_VISUAL = {
  ...common,
  id: "casablanca-maarif-signature-v1",
  sceneRole: "signature",
  semanticRole: "maarif_urban_axis",
  descriptors: ["Maârif", "Casablanca", "Axe urbain"] as const,
  source: commonsSource({
    fileName: "Maârif, Morocco - panoramio (1).jpg",
    asset: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Ma%C3%A2rif%2C_Morocco_-_panoramio_%281%29.jpg?width=960",
    sourcePage: "https://commons.wikimedia.org/wiki/File:Ma%C3%A2rif,_Morocco_-_panoramio_(1).jpg",
    author: "karel291",
    license: "CC BY 3.0",
    rightsBasis: "cc_by_3_0",
    rightsNote: "Reuse permitted under Creative Commons Attribution 3.0 with attribution.",
    width: 4608,
    height: 2592,
    bytes: 3823603,
    sha1: "b9477e67fbaa335ac9e0cf41aae4e4cd2472a040",
    locationEvidence: "Wikimedia Commons title and description explicitly identify the scene as Maârif, Morocco; Commons categorizes the file under Casablanca.",
  }),
  truthBoundary: {
    depictsSpecificProperty: false,
    claimInsideNeighborhood: false,
    claimPropertyForSale: false,
    allowedMeaning: "Urban Maârif context only; never a listing-specific property claim.",
  },
} as const;

export const MAARIF_IMMOBILIER_VISUAL = {
  ...common,
  id: "casablanca-maarif-immobilier-v1",
  sceneRole: "immobilier",
  semanticRole: "residential_street_context",
  descriptors: ["Maârif", "Rue résidentielle", "Immeubles"] as const,
  source: {
    fileName: "KartaView 237030461.jpg",
    asset: "/images/neighborhoods/casablanca/maarif/immobilier-v1.jpg",
    sourcePage: "https://kartaview.org/",
    sourceName: "KartaView",
    sourceKind: "open_license" as const,
    author: "Grab / KartaView contributors",
    license: "CC BY-SA 4.0",
    rightsBasis: "cc_by_sa_4_0" as const,
    rightsNote: "KartaView imagery reused under CC BY-SA 4.0 with attribution to Grab / KartaView contributors and ShareAlike.",
    width: 1280,
    height: 720,
    bytes: 413452,
    sha1: "a7d19b5cf7b2989554bd40b4dd9143e039e6929a",
    locationVerified: true,
    location: "Casablanca (33.581895, -7.622657)",
    locationEvidence: "KartaView API geotag; 897.8 m from the Maârif core-east discovery center used by P3.1. Used only as nearby residential morphology, never as proof that a depicted building lies inside Maârif.",
    relationshipToNeighborhood: "nearby_context" as const,
  },
  truthBoundary: {
    depictsSpecificProperty: false,
    claimInsideNeighborhood: false,
    claimPropertyForSale: false,
    allowedMeaning: "Residential street morphology near the Maârif discovery area only.",
  },
} as const;

export const MAARIF_LIFESTYLE_VISUAL = {
  ...common,
  id: "casablanca-maarif-lifestyle-v1",
  sceneRole: "lifestyle",
  semanticRole: "public_square_context",
  descriptors: ["Maârif", "Place publique", "Vie de quartier"] as const,
  source: commonsSource({
    fileName: "Parfumerie jura, Maârif, Casablanca.jpg",
    asset: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Parfumerie_jura%2C_Ma%C3%A2rif%2C_Casablanca.jpg?width=960",
    sourcePage: "https://commons.wikimedia.org/wiki/File:Parfumerie_jura,_Ma%C3%A2rif,_Casablanca.jpg",
    author: "Sam Nabi",
    license: "CC BY-SA 2.0",
    rightsBasis: "cc_by_sa_2_0",
    rightsNote: "Reuse permitted under Creative Commons Attribution-ShareAlike 2.0 with attribution and ShareAlike.",
    width: 2592,
    height: 1944,
    bytes: 2015941,
    sha1: "c1816e02323e1ff6f40740693f5c0a12fb9bddb4",
    locationEvidence: "Wikimedia Commons description explicitly states: public square behind Rue Abou Zaid Addadoussi, Maarif, Casablanca.",
  }),
  truthBoundary: {
    depictsSpecificProperty: false,
    claimInsideNeighborhood: false,
    claimPrivateAmenity: false,
    claimPropertyForSale: false,
    allowedMeaning: "Public-space lifestyle context explicitly associated with Maârif only.",
  },
} as const;

export const MAARIF_NEIGHBORHOOD_VISUALS = [
  MAARIF_SIGNATURE_VISUAL,
  MAARIF_IMMOBILIER_VISUAL,
  MAARIF_LIFESTYLE_VISUAL,
] as const;

export type MaarifNeighborhoodVisual = (typeof MAARIF_NEIGHBORHOOD_VISUALS)[number];
