import { AKKARI_NEIGHBORHOOD_VISUALS } from "./akkari-neighborhood-visuals";
import { AVIATION_NEIGHBORHOOD_VISUALS } from "./aviation-neighborhood-visuals";
import { LES_ORANGERS_NEIGHBORHOOD_VISUALS } from "./les-orangers-neighborhood-visuals";
import { MEDINA_NEIGHBORHOOD_VISUALS } from "./medina-neighborhood-visuals";
import { YACOUB_EL_MANSOUR_NEIGHBORHOOD_VISUALS } from "./yacoub-el-mansour-neighborhood-visuals";

export type RabatNeighborhood =
  | "Agdal"
  | "Akkari"
  | "Aviation"
  | "Hay Riad"
  | "Souissi"
  | "Océan"
  | "Hassan"
  | "Les Orangers"
  | "Médina"
  | "Yacoub El Mansour";

export type RabatRealPhotoAsset = {
  id: string;
  city: "Rabat";
  district: RabatNeighborhood;
  label: string;
  fileName: string;
  asset: string;
  sourcePage: string;
  sourceName: "Wikimedia Commons" | "KartaView";
};

export type ResolvedRabatRealPhotoAsset = RabatRealPhotoAsset & {
  /** Exact normalized district match, or city-wide ambience fallback. */
  contextScope: "district" | "city";
};

const COMMONS_FILE_REDIRECT = "https://commons.wikimedia.org/wiki/Special:Redirect/file/";
const COMMONS_WIKI = "https://commons.wikimedia.org/wiki/";

function encodeCommonsTitle(value: string): string {
  return encodeURIComponent(value.replace(/ /g, "_")).replace(/'/g, "%27");
}

function commonsFileUrl(filename: string): string {
  return `${COMMONS_FILE_REDIRECT}${encodeCommonsTitle(filename)}?width=960`;
}

function commonsSourcePage(filename: string): string {
  return `${COMMONS_WIKI}${encodeCommonsTitle(`File:${filename}`)}`;
}

function photo(
  district: RabatNeighborhood,
  slug: string,
  index: number,
  filename: string,
): RabatRealPhotoAsset {
  return {
    id: `rabat-${slug}-photo-${String(index).padStart(2, "0")}`,
    city: "Rabat",
    district,
    label: `Rabat • ${district}`,
    fileName: filename,
    asset: commonsFileUrl(filename),
    sourcePage: commonsSourcePage(filename),
    sourceName: "Wikimedia Commons",
  };
}

type CertifiedNeighborhoodVisual = {
  id: string;
  source: {
    fileName: string;
    asset: string;
    sourcePage: string;
    sourceName: "Wikimedia Commons" | "KartaView";
  };
};

function certifiedPool(
  district: RabatNeighborhood,
  visuals: readonly CertifiedNeighborhoodVisual[],
): readonly RabatRealPhotoAsset[] {
  return visuals.map((visual) => ({
    id: visual.id,
    city: "Rabat" as const,
    district,
    label: `Rabat • ${district}`,
    fileName: visual.source.fileName,
    asset: visual.source.asset,
    sourcePage: visual.source.sourcePage,
    sourceName: visual.source.sourceName,
  }));
}

export const RABAT_REAL_PHOTO_LIBRARY: Readonly<Record<RabatNeighborhood, readonly RabatRealPhotoAsset[]>> = {
  Agdal: [
    photo("Agdal", "agdal", 1, "Rabat Agdal.jpg"),
    photo("Agdal", "agdal", 2, "Al Boraq Railway station Rabat Agdal.jpg"),
    photo("Agdal", "agdal", 3, "Gare Agdal Rabat Marokko.jpg"),
    photo("Agdal", "agdal", 4, "Gare de Rabat Agdal - panoramio.jpg"),
    photo("Agdal", "agdal", 5, "Gare de Rabat-Agdal.jpg"),
    photo("Agdal", "agdal", 6, "Gare Rabat-Agdal 97470877.jpg"),
    photo("Agdal", "agdal", 7, "Rabat-Agdal railway station in 2026.01.jpg"),
    photo("Agdal", "agdal", 8, "محطة الرباط أكدال.jpg"),
  ],
  Akkari: certifiedPool("Akkari", AKKARI_NEIGHBORHOOD_VISUALS),
  Aviation: certifiedPool("Aviation", AVIATION_NEIGHBORHOOD_VISUALS),
  "Hay Riad": [
    photo("Hay Riad", "hay-riad", 1, "Hay riad.jpg"),
    photo("Hay Riad", "hay-riad", 2, "Hay Riad (335665610).jpg"),
    photo("Hay Riad", "hay-riad", 3, "Hay Riad (335665617).jpg"),
    photo("Hay Riad", "hay-riad", 4, "Rabat hay ryad.jpg"),
    photo("Hay Riad", "hay-riad", 5, "Mahaj.jpg"),
    photo("Hay Riad", "hay-riad", 6, "Riad District.jpg"),
    photo("Hay Riad", "hay-riad", 7, "Mahaj-Meditel.jpg"),
    photo("Hay Riad", "hay-riad", 8, "حي الرياض بالرباط.jpg"),
  ],
  Souissi: [
    photo("Souissi", "souissi", 1, "Rabat,Souissi1.jpg"),
    photo("Souissi", "souissi", 2, "Avenue Mohamed VI Souissi Rabat.jpg"),
    photo("Souissi", "souissi", 3, "Hassan II Park - Rabat - November 2024 - 1.jpg"),
    photo("Souissi", "souissi", 4, "Hassan II Park - Rabat - November 2024 - 2.jpg"),
    photo("Souissi", "souissi", 5, "Hassan II Park - Rabat - November 2024 - 3.jpg"),
    photo("Souissi", "souissi", 6, "FANZONE SOUISSI RABAT CAN2025.jpg"),
    photo("Souissi", "souissi", 7, "FANZONE SOUISSI RABAT 2 CAN MOROCCO 2025.jpg"),
    photo("Souissi", "souissi", 8, "Knawa Band à Van Zon Souissi Rabat.jpg"),
  ],
  "Océan": [
    photo("Océan", "ocean", 1, "Coucher de soleil à quartier l'Océan.JPG"),
    photo("Océan", "ocean", 2, "Coucher de soleil près de Borj Sirat.JPG"),
    photo("Océan", "ocean", 3, "Phare de Rabat 01.jpg"),
    photo("Océan", "ocean", 4, "Phare de Rabat 02.jpg"),
    photo("Océan", "ocean", 5, "Phare de Rabat P1060258.JPG"),
    photo("Océan", "ocean", 6, "Rabat Beach 1.jpg"),
    photo("Océan", "ocean", 7, "22.5. 2023 in Rabat. 04.jpg"),
    photo("Océan", "ocean", 8, "22.5. 2023 in Rabat. 05.jpg"),
  ],
  Hassan: [
    photo("Hassan", "hassan", 1, "Quartier Hassan, Rabat, Morocco - panoramio (1).jpg"),
    photo("Hassan", "hassan", 2, "Quartier Hassan, Rabat, Morocco - panoramio (4).jpg"),
    photo("Hassan", "hassan", 3, "Quartier Hassan, Rabat, Morocco - panoramio (5).jpg"),
    photo("Hassan", "hassan", 4, "Avenue Hassan II Rabat.jpg"),
    photo("Hassan", "hassan", 5, "Hassan tower rabat.jpg"),
    photo("Hassan", "hassan", 6, "Hassan tower in Rabat city Morocco.jpg"),
    photo("Hassan", "hassan", 7, "Hassan Tower Rabat 1.jpg"),
    photo("Hassan", "hassan", 8, "PIcture of Hassan Tower during a sunny day in Rabat.jpg"),
  ],
  "Les Orangers": certifiedPool("Les Orangers", LES_ORANGERS_NEIGHBORHOOD_VISUALS),
  "Médina": certifiedPool("Médina", MEDINA_NEIGHBORHOOD_VISUALS),
  "Yacoub El Mansour": certifiedPool("Yacoub El Mansour", YACOUB_EL_MANSOUR_NEIGHBORHOOD_VISUALS),
};

export const RABAT_REAL_PHOTO_ASSETS = Object.values(RABAT_REAL_PHOTO_LIBRARY).flat();

const RABAT_SEARCH_DISTRICT_POOLS: Readonly<Record<RabatNeighborhood, readonly RabatRealPhotoAsset[]>> = {
  ...RABAT_REAL_PHOTO_LIBRARY,
  Souissi: RABAT_REAL_PHOTO_LIBRARY.Souissi.slice(0, 5),
};

const LEGACY_CITY_AMBIENCE_IDS = new Set([
  "rabat-agdal-photo-01",
  "rabat-agdal-photo-02",
  "rabat-agdal-photo-05",
  "rabat-hay-riad-photo-01",
  "rabat-hay-riad-photo-04",
  "rabat-hay-riad-photo-05",
  "rabat-hay-riad-photo-06",
  "rabat-souissi-photo-01",
  "rabat-souissi-photo-02",
  "rabat-souissi-photo-03",
  "rabat-souissi-photo-04",
  "rabat-souissi-photo-05",
  "rabat-ocean-photo-01",
  "rabat-ocean-photo-02",
  "rabat-ocean-photo-03",
  "rabat-ocean-photo-04",
  "rabat-ocean-photo-06",
  "rabat-hassan-photo-01",
  "rabat-hassan-photo-02",
  "rabat-hassan-photo-03",
  "rabat-hassan-photo-04",
  "rabat-hassan-photo-05",
]);

/** Keep city-wide fallback stable; P2 only activates exact normalized district pools. */
export const RABAT_CITY_AMBIENCE_POOL = RABAT_REAL_PHOTO_ASSETS.filter((asset) =>
  LEGACY_CITY_AMBIENCE_IDS.has(asset.id),
);

const DISTRICT_ALIASES: Readonly<Record<string, RabatNeighborhood>> = {
  agdal: "Agdal",
  akkari: "Akkari",
  aviation: "Aviation",
  "hay riad": "Hay Riad",
  "hay ryad": "Hay Riad",
  souissi: "Souissi",
  ocean: "Océan",
  "l ocean": "Océan",
  "quartier ocean": "Océan",
  hassan: "Hassan",
  "les orangers": "Les Orangers",
  orangers: "Les Orangers",
  medina: "Médina",
  "medina de rabat": "Médina",
  "yacoub el mansour": "Yacoub El Mansour",
  "yaacoub el mansour": "Yacoub El Mansour",
  "hay el fath": "Yacoub El Mansour",
  "hay al fath": "Yacoub El Mansour",
};

function normalizeStructuredValue(value?: string | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeRabatNeighborhood(value?: string | null): RabatNeighborhood | null {
  return DISTRICT_ALIASES[normalizeStructuredValue(value)] ?? null;
}

function hash32(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function selectHighestRandomWeight(
  candidates: readonly RabatRealPhotoAsset[],
  stableKey: string,
): RabatRealPhotoAsset | null {
  if (!stableKey.trim() || candidates.length === 0) return null;

  let winner: RabatRealPhotoAsset | null = null;
  let winnerScore = -1;
  for (const candidate of candidates) {
    const score = hash32(`rabat-real-photo-v2\u001f${stableKey}\u001f${candidate.id}`);
    if (score > winnerScore || (score === winnerScore && winner !== null && candidate.id < winner.id)) {
      winner = candidate;
      winnerScore = score;
    }
  }
  return winner;
}

export function resolveRabatRealPhoto(input: {
  stableKey: string;
  city?: string | null;
  district?: string | null;
}): ResolvedRabatRealPhotoAsset | null {
  if (normalizeStructuredValue(input.city) !== "rabat") return null;

  const district = normalizeRabatNeighborhood(input.district);
  if (district) {
    const searchStableKey = district === "Souissi"
      ? `residential-context\u001f${input.stableKey}`
      : input.stableKey;
    const selected = selectHighestRandomWeight(RABAT_SEARCH_DISTRICT_POOLS[district], searchStableKey);
    return selected ? { ...selected, contextScope: "district" } : null;
  }

  const selected = selectHighestRandomWeight(
    RABAT_CITY_AMBIENCE_POOL,
    `city-ambience\u001f${input.stableKey}`,
  );
  return selected
    ? {
        ...selected,
        label: "Rabat",
        contextScope: "city",
      }
    : null;
}
