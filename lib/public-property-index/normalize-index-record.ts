import type {
  PublicPropertyIndexEngine,
  PublicPropertyIndexPropertyType,
  PublicPropertyIndexRecord,
  PublicPropertyIndexResultSource,
  PublicPropertyIndexTransactionType,
} from "./types";

const CITY_PATTERNS = [
  { name: "Casablanca", tokens: ["casablanca", "casa blanca"] },
  { name: "Rabat", tokens: ["rabat"] },
  { name: "Marrakech", tokens: ["marrakech"] },
  { name: "Tanger", tokens: ["tanger", "tangier"] },
  { name: "Agadir", tokens: ["agadir"] },
  { name: "Fes", tokens: ["fes", "fès"] },
  { name: "Meknes", tokens: ["meknes", "meknès"] },
  { name: "Kenitra", tokens: ["kenitra", "kénitra"] },
  { name: "Mohammedia", tokens: ["mohammedia"] },
  { name: "El Jadida", tokens: ["el jadida"] },
  { name: "Sale", tokens: ["sale", "salé"] },
];

const NEIGHBORHOOD_PATTERNS = [
  { name: "Maarif", tokens: ["maarif", "maariff", "maârif"] },
  { name: "Racine", tokens: ["racine"] },
  { name: "Ain Diab", tokens: ["ain diab", "ain-diab"] },
  { name: "Bourgogne", tokens: ["bourgogne"] },
  { name: "Agdal", tokens: ["agdal"] },
  { name: "Souissi", tokens: ["souissi"] },
  { name: "Hay Riad", tokens: ["hay riad", "hay-riad"] },
  { name: "Gueliz", tokens: ["gueliz", "guéliz"] },
  { name: "Hivernage", tokens: ["hivernage"] },
  { name: "Malabata", tokens: ["malabata"] },
  { name: "Founty", tokens: ["founty"] },
  { name: "Ville Nouvelle", tokens: ["ville nouvelle"] },
  { name: "Hassan", tokens: ["hassan"] },
  { name: "Tabriquet", tokens: ["tabriquet"] },
  { name: "Hamria", tokens: ["hamria"] },
  { name: "Maamora", tokens: ["maamora"] },
  { name: "Parc", tokens: ["parc"] },
  { name: "Finance City", tokens: ["finance city", "cfc", "casablanca finance city"] },
  { name: "Marina", tokens: ["marina"] },
  { name: "Centre Ville", tokens: ["centre ville", "centre-ville"] },
  { name: "Route de l'Ourika", tokens: ["route de l'ourika", "route de l ourika"] },
  { name: "Anfa", tokens: ["anfa"] },
  { name: "Drissia", tokens: ["drissia"] },
];

const PROPERTY_TYPE_PATTERNS: Array<{ type: PublicPropertyIndexPropertyType; tokens: string[] }> = [
  { type: "Appartement", tokens: ["appartement", "apartment", "flat"] },
  { type: "Villa", tokens: ["villa"] },
  { type: "Studio", tokens: ["studio"] },
  { type: "Terrain", tokens: ["terrain", "lot"] },
  { type: "Bureau", tokens: ["bureau", "office"] },
  { type: "Maison", tokens: ["maison", "house"] },
];

const TRANSACTION_PATTERNS: Array<{ type: PublicPropertyIndexTransactionType; tokens: string[] }> = [
  { type: "buy", tokens: ["a vendre", "à vendre", "vente", "buy", "sale"] },
  { type: "rent", tokens: ["a louer", "à louer", "location", "rent"] },
  { type: "new", tokens: ["neuf", "new", "programme neuf"] },
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function sanitizeContactLikeText(value: string): string {
  return collapseWhitespace(
    value
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "")
      .replace(/\b(?:\+?212[\s.-]?)?(?:0\d[\d\s.-]{7,}\d)\b/g, "")
      .replace(/\bwhatsapp\b/gi, "")
      .replace(/\bmail\b/gi, ""),
  );
}

function pickFirstMatch(text: string, patterns: Array<{ name: string; tokens: string[] }>): string | undefined {
  for (const pattern of patterns) {
    if (pattern.tokens.some((token) => text.includes(normalizeText(token)))) {
      return pattern.name;
    }
  }
  return undefined;
}

function pickPropertyType(text: string): PublicPropertyIndexPropertyType | undefined {
  for (const pattern of PROPERTY_TYPE_PATTERNS) {
    if (pattern.tokens.some((token) => text.includes(normalizeText(token)))) {
      return pattern.type;
    }
  }
  return undefined;
}

function pickTransactionType(text: string): PublicPropertyIndexTransactionType | undefined {
  for (const pattern of TRANSACTION_PATTERNS) {
    if (pattern.tokens.some((token) => text.includes(normalizeText(token)))) {
      return pattern.type;
    }
  }
  return undefined;
}

function parseNumericSignal(value: string): number | undefined {
  const cleaned = normalizeText(value);
  const match = cleaned.match(/(\d{2,7}(?:[.,]\d{1,2})?)/);
  if (!match) return undefined;
  const numeric = Number(match[1].replace(",", "."));
  return Number.isFinite(numeric) ? Math.round(numeric) : undefined;
}

function pickPrice(text: string): number | undefined {
  const candidates = [
    text.match(/(?:dh|mad)\s*(\d[\d\s.,]{2,})/i),
    text.match(/(\d[\d\s.,]{2,})\s*(?:dh|mad)/i),
    text.match(/(\d[\d\s.,]{2,})/),
  ];

  for (const match of candidates) {
    if (!match?.[1]) continue;
    const parsed = Number(match[1].replace(/\s+/g, "").replace(",", "."));
    if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
  }

  return undefined;
}

function pickSurface(text: string): number | undefined {
  const match = text.match(/(\d[\d\s.,]{1,})\s*(?:m2|m²|sqm|metres?)/i);
  if (!match?.[1]) return undefined;
  const parsed = Number(match[1].replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : undefined;
}

function getSourceHost(sourceUrl: string, explicitHost?: string): string {
  if (explicitHost?.trim()) return explicitHost.trim();
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function buildDerivedText(parts: Array<string | undefined>): string {
  return normalizeText(parts.filter(Boolean).join(" "));
}

export function inferPublicPropertyIndexAttributes(input: {
  title?: string;
  short_snippet?: string;
  source_url: string;
}): {
  inferred_city?: string;
  inferred_neighborhood?: string;
  inferred_property_type?: PublicPropertyIndexPropertyType;
  inferred_transaction_type?: PublicPropertyIndexTransactionType;
  public_price?: number;
  public_surface?: number;
  source_host: string;
} {
  const derivedText = buildDerivedText([input.title, input.short_snippet, input.source_url]);

  return {
    inferred_city: pickFirstMatch(derivedText, CITY_PATTERNS),
    inferred_neighborhood: pickFirstMatch(derivedText, NEIGHBORHOOD_PATTERNS),
    inferred_property_type: pickPropertyType(derivedText),
    inferred_transaction_type: pickTransactionType(derivedText),
    public_price: pickPrice(input.short_snippet ?? input.title ?? ""),
    public_surface: pickSurface(input.short_snippet ?? input.title ?? ""),
    source_host: getSourceHost(input.source_url),
  };
}

export function normalizePublicPropertyIndexRecord(input: {
  id?: string;
  source_url: string;
  title: string;
  source_host?: string;
  short_snippet?: string | null;
  inferred_city?: string | null;
  inferred_neighborhood?: string | null;
  inferred_property_type?: PublicPropertyIndexPropertyType | null;
  inferred_transaction_type?: PublicPropertyIndexTransactionType | null;
  public_price?: number | null;
  public_surface?: number | null;
  result_source?: PublicPropertyIndexResultSource;
  provider_engine?: PublicPropertyIndexEngine;
  observed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  observation_count?: number | null;
}): PublicPropertyIndexRecord {
  const now = new Date().toISOString();
  const derived = inferPublicPropertyIndexAttributes({
    title: input.title,
    short_snippet: input.short_snippet ?? undefined,
    source_url: input.source_url,
  });

  const title = collapseWhitespace(input.title.trim());
  const shortSnippet = input.short_snippet?.trim()
    ? sanitizeContactLikeText(input.short_snippet)
    : undefined;

  return {
    id: input.id?.trim() || `${getSourceHost(input.source_url)}:${encodeURIComponent(title.toLowerCase())}`,
    source_host: getSourceHost(input.source_url, input.source_host ?? derived.source_host),
    source_url: input.source_url.trim(),
    title,
    short_snippet: shortSnippet,
    inferred_city: input.inferred_city?.trim() || derived.inferred_city,
    inferred_neighborhood: input.inferred_neighborhood?.trim() || derived.inferred_neighborhood,
    inferred_property_type: input.inferred_property_type ?? derived.inferred_property_type,
    inferred_transaction_type: input.inferred_transaction_type ?? derived.inferred_transaction_type,
    public_price: input.public_price ?? derived.public_price ?? null,
    public_surface: input.public_surface ?? derived.public_surface ?? null,
    result_source: input.result_source ?? "manual_seed",
    provider_engine: input.provider_engine,
    observed_at: input.observed_at?.trim() || now,
    created_at: input.created_at?.trim() || now,
    updated_at: input.updated_at?.trim() || now,
    observation_count: Math.max(1, Math.trunc(input.observation_count ?? 1)),
  };
}

export function sanitizePublicPropertyIndexSnippet(snippet?: string | null): string | undefined {
  if (!snippet?.trim()) return undefined;
  const sanitized = sanitizeContactLikeText(snippet);
  return sanitized.length > 0 ? sanitized : undefined;
}

export function normalizePublicPropertyIndexText(value: string): string {
  return normalizeText(value);
}
