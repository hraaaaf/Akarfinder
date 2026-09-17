import { GEO_NEIGHBORHOODS } from "./geo-entity-registry";
import type { LandmarkTerritoryEntity } from "./territory-dictionary";

export type VerifiedLandmarkEntry = {
  entity: LandmarkTerritoryEntity;
  sourceRefs: readonly [string, string, ...string[]];
  verificationNote: string;
  verifiedAt: string;
};

export const VERIFIED_LANDMARKS: readonly VerifiedLandmarkEntry[] = [
  {
    entity: {
      id: "landmark_casablanca_finance_city_cfc_tower",
      type: "landmark",
      citySlug: "casablanca",
      districtSlug: "finance-city",
      landmarkSlug: "cfc-tower",
      canonicalName: "CFC First Tower",
      aliases: ["Casablanca Finance City Tower", "Tour CFC"],
      category: "business",
      parentId: "district_casablanca_finance_city",
      importance: {
        score: 95,
        tier: "major",
        basis: ["product_priority", "orientation_value"],
      },
      visibility: { minZoom: 13.8, retainPriority: true },
      coordinates: {
        lat: 33.56358,
        lng: -7.66096,
        precision: "verified_landmark_point",
      },
    },
    sourceRefs: [
      "https://casablancafinancecity.com/sites/default/files/2025-09/RA_Print_compressed%20%281%29.pdf",
      "https://mapcarta.com/W871612907",
    ],
    verificationNote: "Official CFC address + OSM/Wikidata-backed point; parent district is canonical Casablanca Finance City.",
    verifiedAt: "2026-09-18",
  },
  {
    entity: {
      id: "landmark_rabat_agdal_station",
      type: "landmark",
      citySlug: "rabat",
      districtSlug: "agdal",
      landmarkSlug: "gare-rabat-agdal",
      canonicalName: "Gare Rabat-Agdal",
      aliases: ["Rabat Agdal Station", "Gare d’Agdal"],
      category: "transport",
      parentId: "district_rabat_agdal",
      importance: {
        score: 100,
        tier: "flagship",
        basis: ["product_priority", "orientation_value"],
      },
      visibility: { minZoom: 13.5, retainPriority: true },
      coordinates: {
        lat: 34.0012,
        lng: -6.85739,
        precision: "verified_landmark_point",
      },
    },
    sourceRefs: [
      "https://www.oncf.ma/en/content/download/37209/850874/file/Gare%20de%20Rabat-agdal%20-%20VF.pdf",
      "https://mapcarta.com/W654504928",
    ],
    verificationNote: "ONCF confirms Rabat-Agdal and its Agdal side; OSM-backed point confirms the station location.",
    verifiedAt: "2026-09-18",
  },
  {
    entity: {
      id: "landmark_marrakech_hivernage_menara_mall",
      type: "landmark",
      citySlug: "marrakech",
      districtSlug: "hivernage",
      landmarkSlug: "menara-mall",
      canonicalName: "Menara Mall",
      aliases: ["Ménara Mall"],
      category: "retail",
      parentId: "district_marrakech_hivernage",
      importance: {
        score: 95,
        tier: "major",
        basis: ["product_priority", "orientation_value"],
      },
      visibility: { minZoom: 13.8, retainPriority: true },
      coordinates: {
        lat: 31.61806,
        lng: -8.00974,
        precision: "verified_landmark_point",
      },
    },
    sourceRefs: [
      "https://www.menaramall.com/",
      "https://visitmarrakech.com/listing/menara-mall/",
      "https://mapcarta.com/fr/N3320049181",
    ],
    verificationNote: "Official mall + official Marrakech guide + OSM-backed point support identity, Hivernage association and coordinates.",
    verifiedAt: "2026-09-18",
  },
  {
    entity: {
      id: "landmark_fes_el_bali_bab_bou_jeloud",
      type: "landmark",
      citySlug: "fes",
      districtSlug: "fes-el-bali",
      landmarkSlug: "bab-bou-jeloud",
      canonicalName: "Bab Bou Jeloud",
      aliases: ["Bab Boujloud", "Porte Bleue"],
      category: "heritage",
      parentId: "district_fes_el_bali",
      importance: {
        score: 100,
        tier: "flagship",
        basis: ["product_priority", "orientation_value"],
      },
      visibility: { minZoom: 13.4, retainPriority: true },
      coordinates: {
        lat: 34.0617,
        lng: -4.98402,
        precision: "verified_landmark_point",
      },
    },
    sourceRefs: [
      "https://www.wikidata.org/wiki/Q2881543",
      "https://mapcarta.com/W574667510",
    ],
    verificationNote: "Wikidata identifies Bab Bou Jeloud as part of the Medina of Fez; the independent OSM-backed point agrees on the gate coordinate.",
    verifiedAt: "2026-09-18",
  },
  {
    entity: {
      id: "landmark_agadir_talborjt_mosquee_mohamed_v",
      type: "landmark",
      citySlug: "agadir",
      districtSlug: "talborjt",
      landmarkSlug: "mosquee-mohamed-v",
      canonicalName: "Mosquée Mohamed V",
      aliases: ["Mosque Mohammed V", "Mosquée Mohammed V"],
      category: "worship",
      parentId: "district_agadir_talborjt",
      importance: {
        score: 98,
        tier: "flagship",
        basis: ["product_priority", "orientation_value"],
      },
      visibility: { minZoom: 13.5, retainPriority: true },
      coordinates: {
        lat: 30.42215,
        lng: -9.59252,
        precision: "verified_landmark_point",
      },
    },
    sourceRefs: [
      "https://agadirmonuments.com/agadir-monuments-la-mosquee-mohamed-v/",
      "https://www.barcelo.com/guia-turismo/fr/maroc/agadir/a-voir-et-a-faire/mosquees-agadir/",
      "https://mapcarta.com/29431532",
    ],
    verificationNote: "Two independent descriptive sources place the mosque in Nouveau Talborjt; the OSM-backed point provides the verified coordinate.",
    verifiedAt: "2026-09-18",
  },
];

const CANONICAL_DISTRICT_IDS = new Set(GEO_NEIGHBORHOODS.map((district) => district.id));

export function getVerifiedLandmarksForDistrict(districtId: string): VerifiedLandmarkEntry[] {
  if (!CANONICAL_DISTRICT_IDS.has(districtId)) return [];
  return VERIFIED_LANDMARKS
    .filter((entry) => entry.entity.parentId === districtId)
    .sort((a, b) => b.entity.importance.score - a.entity.importance.score);
}
