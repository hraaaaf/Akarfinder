import { NEIGHBORHOOD_VISUAL_TEMPLATE_A } from "./neighborhood-visual-template-a";

const COMMONS_FILE_REDIRECT = "https://commons.wikimedia.org/wiki/Special:Redirect/file/";
const COMMONS_WIKI = "https://commons.wikimedia.org/wiki/";

function encodeCommonsTitle(value: string): string {
  return encodeURIComponent(value.replace(/ /g, "_")).replace(/'/g, "%27");
}

function commonsSource(fileName: string, details: {
  author: string; capturedAt: string; width: number; height: number; bytes: number; sha1: string;
  location: string; locationEvidence: string; locationEvidenceUrl: string;
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
    capturedAt: details.capturedAt, width: details.width, height: details.height, bytes: details.bytes, sha1: details.sha1,
    locationVerified: true, location: details.location, locationEvidence: details.locationEvidence, locationEvidenceUrl: details.locationEvidenceUrl,
  } as const;
}

function kartaViewSource(details: {
  photoId: number; sequenceId: number; asset: string; capturedAt: string; latitude: number; longitude: number;
  heading: number; bytes: number; sha1: string; sourceNote: string;
}) {
  const sourcePage = `https://api.openstreetcam.org/2.0/photo/?id=${details.photoId}`;
  return {
    fileName: `KartaView photo ${details.photoId} · fileurlLTh`,
    asset: details.asset,
    sourcePage,
    sourceName: "KartaView",
    sourceKind: "open_license" as const,
    author: "© Grab and KartaView Contributors",
    license: "CC BY-SA 4.0",
    rightsBasis: "cc_by_sa_4_0" as const,
    rightsNote: "KartaView street imagery is reused under CC BY-SA 4.0 with attribution to © Grab and KartaView Contributors. Certified bytes are pinned in the AkarFinder repository so product delivery does not depend on the upstream CDN URL remaining live.",
    capturedAt: details.capturedAt,
    width: 1280, height: 720, bytes: details.bytes, sha1: details.sha1,
    locationVerified: true,
    location: `Akkari, Rabat, Morocco (${details.latitude}, ${details.longitude})`,
    locationEvidence: `KartaView photo ${details.photoId}, sequence ${details.sequenceId}, is geotagged at ${details.latitude}, ${details.longitude} with heading ${details.heading}°. ${details.sourceNote}`,
    locationEvidenceUrl: sourcePage,
  } as const;
}

const common = {
  templateId: NEIGHBORHOOD_VISUAL_TEMPLATE_A.id,
  city: "Rabat", neighborhood: "Akkari", title: "AKKARI", cityLabel: "Rabat",
  presentation: {
    treatment: "css_only", preserveSourcePixels: true, bakedText: false, overlayPlacement: "lower_left",
    disclosureLabel: NEIGHBORHOOD_VISUAL_TEMPLATE_A.composition.disclosureLabel,
  },
  activation: {
    searchEnabled: false,
    reason: "P1.2 certifies the Akkari library; generalized neighborhood Search resolution remains gated by P2.",
  },
} as const;

export const AKKARI_SIGNATURE_VISUAL = {
  ...common,
  id: "rabat-akkari-signature-v1", sceneRole: "signature", semanticRole: "quartier_signature",
  descriptors: ["Repère", "Quartier", "Mosquée"] as const,
  source: commonsSource("Haj Hassan Al Akkari Mosque - Rabat.jpg", {
    author: "RACHID BAYA", capturedAt: "2026-03-29", width: 3000, height: 4000, bytes: 2_417_308,
    sha1: "b81c1ec25a3de2b176911a8e6662ad8967d2c411",
    location: "Haj Hassan Al Akkari Mosque, Rabat, Morocco",
    locationEvidence: "The Commons file explicitly identifies Haj Hassan Al Akkari Mosque in Rabat and is geotagged at 34.01288605, -6.86349618.",
    locationEvidenceUrl: "https://commons.wikimedia.org/wiki/File:Haj_Hassan_Al_Akkari_Mosque_-_Rabat.jpg",
  }),
  truthBoundary: { depictsSpecificProperty: false, claimPropertyForSale: false, allowedMeaning: "Recognizable public landmark of Akkari only" },
} as const;

export const AKKARI_IMMOBILIER_VISUAL = {
  ...common,
  id: "rabat-akkari-immobilier-v1", sceneRole: "immobilier", semanticRole: "morphologie_batie",
  descriptors: ["Résidentiel", "Urbain", "Façades"] as const,
  source: kartaViewSource({
    photoId: 260132875, sequenceId: 1224587,
    asset: "/neighborhood-visuals/rabat/akkari/immobilier/kartaview-260132875.jpg",
    capturedAt: "2018-05-22 13:22:03", latitude: 34.008988, longitude: -6.862511, heading: 140,
    bytes: 270_159, sha1: "2466f43109b1f2b0b5c55b4acca2a59585a7438e",
    sourceNote: "The exact 1280×720 fileurlLTh rendition is certified unchanged and pinned byte-for-byte in-repo as neighborhood built morphology, never as a listing-specific property.",
  }),
  truthBoundary: {
    depictsSpecificProperty: false, claimApartment: false, claimPropertyForSale: false, claimResidentialInterior: false,
    allowedMeaning: "Representative residential street morphology of Akkari only",
  },
} as const;

export const AKKARI_LIFESTYLE_VISUAL = {
  ...common,
  id: "rabat-akkari-lifestyle-v1", sceneRole: "lifestyle", semanticRole: "cadre_de_vie_public",
  descriptors: ["Vie locale", "Mobilité", "Commerces"] as const,
  source: kartaViewSource({
    photoId: 260133961, sequenceId: 1224599,
    asset: "/neighborhood-visuals/rabat/akkari/lifestyle/kartaview-260133961.jpg",
    capturedAt: "2018-05-22 12:49:35", latitude: 34.009151, longitude: -6.86069, heading: 214,
    bytes: 251_579, sha1: "015123bef3d8a5c98d9f31ab3f3a581272a6ae4e",
    sourceNote: "The exact 1280×720 fileurlLTh rendition is certified unchanged and pinned byte-for-byte in-repo as public local-life context, never as a property amenity.",
  }),
  truthBoundary: {
    depictsSpecificProperty: false, claimPrivateAmenity: false, claimPropertyForSale: false,
    allowedMeaning: "Public street-life, mobility and commercial context of Akkari only",
  },
} as const;

export const AKKARI_NEIGHBORHOOD_VISUALS = [AKKARI_SIGNATURE_VISUAL, AKKARI_IMMOBILIER_VISUAL, AKKARI_LIFESTYLE_VISUAL] as const;
export type AkkariNeighborhoodVisual = (typeof AKKARI_NEIGHBORHOOD_VISUALS)[number];
