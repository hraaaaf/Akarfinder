import { MAARIF_NEIGHBORHOOD_VISUALS } from "./maarif-neighborhood-visuals";

export type CasablancaNeighborhood = "Maârif";

export type CasablancaRealPhotoAsset = {
  id: string;
  city: "Casablanca";
  district: CasablancaNeighborhood;
  label: string;
  fileName: string;
  asset: string;
  sourcePage: string;
  sourceName: "Wikimedia Commons" | "KartaView";
};

export type ResolvedCasablancaRealPhotoAsset = CasablancaRealPhotoAsset & {
  contextScope: "district";
};

type CertifiedNeighborhoodVisual = {
  id: string;
  source: {
    fileName: string;
    asset: string;
    sourcePage: string;
    sourceName: string;
  };
};

function certifiedPool(
  district: CasablancaNeighborhood,
  visuals: readonly CertifiedNeighborhoodVisual[],
): readonly CasablancaRealPhotoAsset[] {
  return visuals.map((visual) => {
    const sourceName = visual.source.sourceName;
    if (sourceName !== "Wikimedia Commons" && sourceName !== "KartaView") {
      throw new Error(`Unsupported certified Casablanca neighborhood visual source: ${sourceName}`);
    }
    return {
      id: visual.id,
      city: "Casablanca" as const,
      district,
      label: `Casablanca • contexte ${district}`,
      fileName: visual.source.fileName,
      asset: visual.source.asset,
      sourcePage: visual.source.sourcePage,
      sourceName,
    };
  });
}

export const CASABLANCA_REAL_PHOTO_LIBRARY: Readonly<
  Record<CasablancaNeighborhood, readonly CasablancaRealPhotoAsset[]>
> = {
  "Maârif": certifiedPool("Maârif", MAARIF_NEIGHBORHOOD_VISUALS),
};

const DISTRICT_ALIASES: Readonly<Record<string, CasablancaNeighborhood>> = {
  maarif: "Maârif",
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

export function normalizeCasablancaNeighborhood(
  value?: string | null,
): CasablancaNeighborhood | null {
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
  candidates: readonly CasablancaRealPhotoAsset[],
  stableKey: string,
): CasablancaRealPhotoAsset | null {
  if (!stableKey.trim() || candidates.length === 0) return null;

  let winner: CasablancaRealPhotoAsset | null = null;
  let winnerScore = -1;
  for (const candidate of candidates) {
    const score = hash32(`casablanca-real-photo-v1\u001f${stableKey}\u001f${candidate.id}`);
    if (score > winnerScore || (score === winnerScore && winner !== null && candidate.id < winner.id)) {
      winner = candidate;
      winnerScore = score;
    }
  }
  return winner;
}

export function resolveCasablancaRealPhoto(input: {
  stableKey: string;
  city?: string | null;
  district?: string | null;
}): ResolvedCasablancaRealPhotoAsset | null {
  if (normalizeStructuredValue(input.city) !== "casablanca") return null;

  const district = normalizeCasablancaNeighborhood(input.district);
  if (!district) return null;

  const selected = selectHighestRandomWeight(
    CASABLANCA_REAL_PHOTO_LIBRARY[district],
    input.stableKey,
  );
  return selected ? { ...selected, contextScope: "district" } : null;
}
