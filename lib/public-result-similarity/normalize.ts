import type { PublicResultSimilarityInput } from "./types";

export type NormalizedPublicResultSimilarityInput = PublicResultSimilarityInput & {
  normalized_text: string;
  city?: string;
  neighborhood?: string;
  transaction_type?: "buy" | "rent" | "new" | "land";
  property_type?: "appartement" | "studio" | "villa" | "terrain" | "maison" | "programme";
  price_mad?: number;
  surface_m2?: number;
  source_host: string;
};

const CITY_ALIASES: Record<string, ReadonlyArray<string>> = {
  casablanca: ["casablanca"],
  rabat: ["rabat"],
  marrakech: ["marrakech", "marrakesh"],
  agadir: ["agadir"],
  tanger: ["tanger", "tangier"],
  fes: ["fes", "fez"],
};

const NEIGHBORHOOD_ALIASES: Record<string, ReadonlyArray<string>> = {
  maarif: ["maarif"],
  agdal: ["agdal"],
  gueliz: ["gueliz", "guéliz", "guéliz"],
  hay_riad: ["hay riad", "hay-riad"],
  bouskoura: ["bouskoura"],
  dar_bouazza: ["dar bouazza", "dar-bouazza"],
  anfa: ["anfa"],
};

function normalizeText(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s./-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectAlias(
  text: string,
  aliases: Record<string, ReadonlyArray<string>>,
): string | undefined {
  for (const [key, values] of Object.entries(aliases)) {
    if (values.some((value) => text.includes(value))) {
      return key;
    }
  }
  return undefined;
}

function detectTransactionType(text: string): "buy" | "rent" | "new" | "land" | undefined {
  if (/\b(location|a louer|a louer|louer|loyer|rent)\b/.test(text)) return "rent";
  if (/\b(programme neuf|projet neuf|immobilier neuf|residence neuve)\b/.test(text)) return "new";
  if (/\b(terrain|lotissement|constructible)\b/.test(text)) return "land";
  if (/\b(a vendre|vente|acheter|achat|for sale)\b/.test(text)) return "buy";
  return undefined;
}

function detectPropertyType(
  text: string,
): "appartement" | "studio" | "villa" | "terrain" | "maison" | "programme" | undefined {
  if (/\b(programme neuf|projet neuf|immobilier neuf)\b/.test(text)) return "programme";
  if (/\bstudio\b/.test(text)) return "studio";
  if (/\bterrain\b/.test(text)) return "terrain";
  if (/\bvilla\b/.test(text)) return "villa";
  if (/\bmaison\b/.test(text)) return "maison";
  if (/\b(appartement|apartment)\b/.test(text)) return "appartement";
  return undefined;
}

function parsePriceMad(text: string): number | undefined {
  const direct = text.match(/(\d[\d\s.]*)\s*(dh|mad)\b/);
  if (!direct) return undefined;
  const value = Number(direct[1].replace(/[^\d]/g, ""));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function parseSurfaceM2(text: string): number | undefined {
  const surface = text.match(/(\d{2,4})\s*(m2|m²|metres carres|metres carres|sqm)\b/);
  if (!surface) return undefined;
  const value = Number(surface[1]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function parseSourceHost(input: PublicResultSimilarityInput): string {
  if (input.source_host?.trim()) return normalizeText(input.source_host);
  try {
    return normalizeText(new URL(input.original_url).hostname);
  } catch {
    return normalizeText(input.display_url);
  }
}

export function normalizePublicResultSimilarityInput(
  input: PublicResultSimilarityInput,
): NormalizedPublicResultSimilarityInput {
  const normalized_text = normalizeText(
    [input.title, input.snippet, input.display_url, input.original_url].filter(Boolean).join(" "),
  );

  return {
    ...input,
    normalized_text,
    city: detectAlias(normalized_text, CITY_ALIASES),
    neighborhood: detectAlias(normalized_text, NEIGHBORHOOD_ALIASES),
    transaction_type: detectTransactionType(normalized_text),
    property_type: detectPropertyType(normalized_text),
    price_mad: parsePriceMad(normalized_text),
    surface_m2: parseSurfaceM2(normalized_text),
    source_host: parseSourceHost(input),
  };
}
