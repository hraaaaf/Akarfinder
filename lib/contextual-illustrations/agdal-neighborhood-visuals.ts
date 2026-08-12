import { NEIGHBORHOOD_VISUAL_TEMPLATE_A } from "./neighborhood-visual-template-a";

const COMMONS_FILE_REDIRECT = "https://commons.wikimedia.org/wiki/Special:Redirect/file/";
const COMMONS_WIKI = "https://commons.wikimedia.org/wiki/";
const FAL_OULD_OUMEIR_LOCATION_EVIDENCE = "https://www.visitrabat.com/en/lieux/fal-ould-oumeir-avenue/";

function encodeCommonsTitle(value: string): string {
  return encodeURIComponent(value.replace(/ /g, "_")).replace(/'/g, "%27");
}

function commonsSource(fileName: string, details: {
  author: string;
  capturedAt: string;
  width: number;
  height: number;
  bytes: number;
  sha1: string;
  location: string;
  locationEvidence: string;
}) {
  return {
    fileName,
    asset: `${COMMONS_FILE_REDIRECT}${encodeCommonsTitle(fileName)}`,
    sourcePage: `${COMMONS_WIKI}${encodeCommonsTitle(`File:${fileName}`)}`,
    sourceName: "Wikimedia Commons",
    sourceKind: "open_license" as const,
    author: details.author,
    license: "CC BY-SA 4.0",
    rightsBasis: "cc_by_sa_4_0" as const,
    rightsNote: "Reuse and modification allowed with attribution and ShareAlike.",
    capturedAt: details.capturedAt,
    width: details.width,
    height: details.height,
    bytes: details.bytes,
    sha1: details.sha1,
    locationVerified: true,
    location: details.location,
    locationEvidence: details.locationEvidence,
    locationEvidenceUrl: null,
  } as const;
}

function projectSuppliedSource(details: {
  fileName: string;
  width: number;
  height: number;
  bytes: number;
  sha1: string;
  location: string;
  locationEvidence: string;
}) {
  return {
    fileName: details.fileName,
    asset: null,
    sourcePage: null,
    sourceName: "AkarFinder project-supplied source",
    sourceKind: "project_supplied" as const,
    author: "Photographer not asserted",
    license: "Direct AkarFinder project authorization",
    rightsBasis: "direct_project_authorization" as const,
    rightsNote: "Source file supplied directly for AkarFinder use on 2026-08-12. No Creative Commons status or photographer identity is asserted.",
    capturedAt: "not_asserted",
    width: details.width,
    height: details.height,
    bytes: details.bytes,
    sha1: details.sha1,
    locationVerified: true,
    location: details.location,
    locationEvidence: details.locationEvidence,
    locationEvidenceUrl: FAL_OULD_OUMEIR_LOCATION_EVIDENCE,
    archive: {
      visibility: "private_project_archive" as const,
      publicUrl: null,
      byteExactEvidence: true,
    },
  } as const;
}

const common = {
  templateId: NEIGHBORHOOD_VISUAL_TEMPLATE_A.id,
  city: "Rabat",
  neighborhood: "Agdal",
  title: "AGDAL",
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
    reason: "P1.1 certifies the Agdal library; generalized neighborhood Search resolution remains gated by P2.",
  },
} as const;

export const AGDAL_SIGNATURE_VISUAL = {
  ...common,
  id: "rabat-agdal-signature-v1",
  sceneRole: "signature",
  semanticRole: "quartier_signature",
  descriptors: ["Connecté", "Urbain", "Gare"] as const,
  source: commonsSource("Al Boraq Railway station Rabat Agdal.jpg", {
    author: "SpreeTom",
    capturedAt: "2019-02-16",
    width: 4160,
    height: 2340,
    bytes: 2_880_808,
    sha1: "6cded8a860ea6b7517e81c432c1bf858ccf6b52e",
    location: "Gare de Rabat-Agdal, Rabat, Morocco",
    locationEvidence: "Commons description explicitly identifies Rabat Agdal station and files it under Gare de Rabat-Agdal.",
  }),
  truthBoundary: {
    depictsSpecificProperty: false,
    claimPropertyForSale: false,
    allowedMeaning: "Recognizable public mobility landmark of Agdal only",
  },
} as const;

export const AGDAL_IMMOBILIER_VISUAL = {
  ...common,
  id: "rabat-agdal-immobilier-v2",
  sceneRole: "immobilier",
  semanticRole: "morphologie_batie",
  descriptors: ["Urbain", "Immeubles", "Commerces"] as const,
  source: projectSuppliedSource({
    fileName: "Avenue Fal Ould Oumeir — Agdal — source projet.jpeg",
    width: 1024,
    height: 1024,
    bytes: 330_658,
    sha1: "6adb3fffe36a6ace60ef9aee4907920e031abbd7",
    location: "Avenue Fal Ould Oumeir, Agdal, Rabat, Morocco",
    locationEvidence: "The supplied photograph depicts Avenue Fal Ould Oumeir. Visit Rabat independently identifies Fal Ould Oumeir Avenue as located in the heart of Agdal, Rabat. P1.1 uses the image only as neighborhood built-morphology ambience, never as a specific property claim.",
  }),
  productAsset: {
    path: "/neighborhood-visuals/rabat/agdal/immobilier/fal-ould-oumeir-search.jpg",
    storagePath: "rabat/agdal/immobilier/search.jpg",
    transform: "deterministic_crop_resize" as const,
    generativeEdit: false,
    crop: { left: 0, top: 224, width: 1024, height: 576 },
    width: 320,
    height: 180,
    bytes: 11_487,
    sha1: "dd4eaab40b68090dcba6f85c58f1365213e0177f",
    sourceMasterSha1: "6adb3fffe36a6ace60ef9aee4907920e031abbd7",
  },
  truthBoundary: {
    depictsSpecificProperty: false,
    claimApartment: false,
    claimPropertyForSale: false,
    claimResidentialInterior: false,
    allowedMeaning: "Representative street-front built morphology of Avenue Fal Ould Oumeir in Agdal only",
  },
} as const;

export const AGDAL_LIFESTYLE_VISUAL = {
  ...common,
  id: "rabat-agdal-lifestyle-v1",
  sceneRole: "lifestyle",
  semanticRole: "cadre_de_vie_public",
  descriptors: ["Verdoyant", "Promenade", "Jardin"] as const,
  source: commonsSource("Jardin d'essai botanique, Rabat.jpg", {
    author: "Ideophagous",
    capturedAt: "2025-10-28",
    width: 4080,
    height: 3060,
    bytes: 3_651_983,
    sha1: "73da97f09b0dc9cf796a9bac8a210f78525667ff",
    location: "Jardin d'essais de Rabat / Jardin d'essai de l'Agdal, Rabat, Morocco",
    locationEvidence: "Commons GPS 34.007681,-6.845169; Commons category identifies the site also as Jardin d'essai de l'Agdal.",
  }),
  truthBoundary: {
    depictsSpecificProperty: false,
    claimPrivateGarden: false,
    claimPropertyAmenity: false,
    allowedMeaning: "Public green-space lifestyle context for Agdal only",
  },
} as const;

export const AGDAL_NEIGHBORHOOD_VISUALS = [
  AGDAL_SIGNATURE_VISUAL,
  AGDAL_IMMOBILIER_VISUAL,
  AGDAL_LIFESTYLE_VISUAL,
] as const;

export type AgdalNeighborhoodVisual = (typeof AGDAL_NEIGHBORHOOD_VISUALS)[number];
