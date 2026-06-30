// GOOGLE-LIKE-SEARCH-QA-1 — Deterministic natural language parser for homepage search.
// No AI, no external API. Rules-based extraction. Conservative: if uncertain, preserve in q.

export type ParsedSearchQuery = {
  q: string;            // original input always preserved
  intent?: "buy" | "rent" | "new";
  property_type?: string;
  city?: string;
  district?: string;    // neighborhood — future filter, currently aids text search
  budget_max?: number;
  furnished?: boolean;
};

// ─── City dictionary ──────────────────────────────────────────────────────────
// Values must match the city names stored in DB (capitalized, no accents in keys).
const CITY_ALIASES: [RegExp, string][] = [
  [/\bcasablanca\b/, "Casablanca"],
  [/\bcasa\b/, "Casablanca"],
  [/\bmarrakech\b/, "Marrakech"],
  [/\bmarakech\b/, "Marrakech"],
  [/\btanger\b/, "Tanger"],
  [/\btangier\b/, "Tanger"],
  [/\btetouan\b/, "Tetouan"],
  [/\btetouan\b/, "Tetouan"],
  [/\bkenitra\b/, "Kenitra"],
  [/\beljadida\b/, "El Jadida"],
  [/\bel jadida\b/, "El Jadida"],
  [/\bessaouira\b/, "Essaouira"],
  [/\boujda\b/, "Oujda"],
  [/\btemara\b/, "Temara"],
  [/\bsale\b/, "Sale"],
  [/\bmeknes\b/, "Meknes"],
  [/\bagadir\b/, "Agadir"],
  [/\bfes\b/, "Fes"],
  [/\bfez\b/, "Fes"],
  [/\brabat\b/, "Rabat"],
];

// ─── District dictionary — longest match first to avoid partial hits ──────────
const DISTRICT_ALIASES: [string, string][] = [
  ["finance city", "Finance City"],
  ["dar bouazza", "Dar Bouazza"],
  ["hay riad", "Hay Riad"],
  ["ville nouvelle", "Ville Nouvelle"],
  ["route ourika", "Route Ourika"],
  ["maarif", "Maarif"],
  ["maârif", "Maarif"],
  ["agdal", "Agdal"],
  ["souissi", "Souissi"],
  ["hassan", "Hassan"],
  ["bouskoura", "Bouskoura"],
  ["gauthier", "Gauthier"],
  ["californie", "Californie"],
  ["gueliz", "Gueliz"],
  ["hivernage", "Hivernage"],
  ["malabata", "Malabata"],
  ["founty", "Founty"],
  ["talborjt", "Talborjt"],
];

// ─── Normalize for matching ───────────────────────────────────────────────────
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/'/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Parse a numeric amount string (handles spaces, k suffix) ─────────────────
function parseAmount(raw: string): number | undefined {
  const cleaned = raw.replace(/\s/g, "").toLowerCase();
  if (cleaned.endsWith("k")) {
    const n = parseFloat(cleaned.slice(0, -1));
    return Number.isFinite(n) ? Math.round(n * 1000) : undefined;
  }
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// ─── Main parser ──────────────────────────────────────────────────────────────
export function parseNaturalSearchQuery(input: string): ParsedSearchQuery {
  const q = input.trim();
  if (!q) return { q: "" };

  const n = norm(q);
  const result: ParsedSearchQuery = { q };

  // ── Intent ──────────────────────────────────────────────────────────────────
  if (/\b(louer|location|a louer|en location)\b/.test(n)) {
    result.intent = "rent";
  } else if (/\b(neuf|programme neuf|projet neuf|livraison|haut standing neuf)\b/.test(n)) {
    result.intent = "new";
  } else if (/\b(acheter|vente|a vendre|vendre|achat)\b/.test(n)) {
    result.intent = "buy";
  }

  // ── Furnished (implies rent if no other intent) ───────────────────────────
  if (/\b(meuble|meublee|meublee)\b/.test(n)) {
    result.furnished = true;
    if (!result.intent) result.intent = "rent";
  }

  // ── Property type ──────────────────────────────────────────────────────────
  if (/\b(appartement|appt|appart)\b/.test(n)) {
    result.property_type = "Appartement";
  } else if (/\bvilla\b/.test(n)) {
    result.property_type = "Villa";
  } else if (/\bterrain\b/.test(n)) {
    result.property_type = "Terrain";
  } else if (/\bstudio\b/.test(n)) {
    result.property_type = "Studio";
  } else if (/\bbureau\b/.test(n)) {
    result.property_type = "Bureau";
  } else if (/\bmaison\b/.test(n)) {
    result.property_type = "Maison";
  }

  // ── District — multi-word first ────────────────────────────────────────────
  for (const [alias, canonical] of DISTRICT_ALIASES) {
    if (n.includes(alias)) {
      result.district = canonical;
      break;
    }
  }

  // ── City ───────────────────────────────────────────────────────────────────
  for (const [re, canonical] of CITY_ALIASES) {
    if (re.test(n)) {
      result.city = canonical;
      break;
    }
  }

  // ── Budget ─────────────────────────────────────────────────────────────────
  // Pattern 1: trigger phrase + amount (e.g. "moins de 8 000 DH")
  const triggerRe = /(?:moins de|jusqu a|jusqu au|max\.?\s*|budget|inferieur a|maxi?)\s*([\d][\d\s]*k?)\s*(?:dh|mad|dirhams)?/;
  const triggerMatch = n.match(triggerRe);
  if (triggerMatch) {
    const amount = parseAmount(triggerMatch[1].trim());
    if (amount !== undefined && amount >= 100) {
      result.budget_max = amount;
    }
  }

  // Pattern 2: amount followed by currency marker (e.g. "900 000 DH")
  if (!result.budget_max) {
    const withCurrencyRe = /([\d][\d\s]*k?)\s*(?:dh|mad|dirhams)(?:\s|$)/g;
    let lastMatch: RegExpExecArray | null = null;
    let m: RegExpExecArray | null;
    while ((m = withCurrencyRe.exec(n)) !== null) lastMatch = m;
    if (lastMatch) {
      const amount = parseAmount(lastMatch[1].trim());
      if (amount !== undefined && amount >= 100) result.budget_max = amount;
    }
  }

  // Pattern 3: standalone number >= 1000 at end of query (after stripping known tokens)
  if (!result.budget_max) {
    const stripped = n
      .replace(/\b(appartement|villa|terrain|studio|bureau|maison|appt|appart)\b/g, "")
      .replace(/\b(louer|location|acheter|vente|vendre|achat|neuf|meuble|meublee)\b/g, "")
      .replace(/\b(a louer|a vendre|en location)\b/g, "")
      .replace(/\b(casablanca|casa|rabat|marrakech|tanger|agadir|fes|fez)\b/g, "")
      .replace(/\b(meknes|sale|temara|oujda|kenitra|tetouan|essaouira)\b/g, "")
      .replace(/\b(maarif|agdal|souissi|gueliz|gauthier|californie|bouskoura)\b/g, "")
      .replace(/\b(finance city|dar bouazza|hay riad|hivernage|malabata|founty)\b/g, "")
      .replace(/\b(avec|sans|moins|plus|de|a|au|en|le|la|les|du|des|et)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const trailingNum = stripped.match(/(?:^|\s)(\d[\d\s]*k?)(?:\s|$)/);
    if (trailingNum) {
      const amount = parseAmount(trailingNum[1].trim());
      if (amount !== undefined && amount >= 1000) result.budget_max = amount;
    }
  }

  return result;
}

// ─── Build URL search params from parsed query ────────────────────────────────
export function parsedQueryToParams(
  parsed: ParsedSearchQuery,
  chipIntent?: "buy" | "rent" | "new",
  chipPropertyType?: string
): URLSearchParams {
  const params = new URLSearchParams();

  // Intent: parser detected → wins over chip default; chip explicit overridden by parser
  // If user typed an explicit intent keyword, use it. Otherwise use chip.
  const effectiveType = parsed.intent ?? chipIntent ?? "buy";
  if (effectiveType !== "buy") params.set("type", effectiveType);

  // Property type: chip explicit (Villa/Terrain/Bureau) → wins; else parser
  const effectivePropType = chipPropertyType ?? parsed.property_type;
  if (effectivePropType) params.set("property_type", effectivePropType);

  // City from parser
  if (parsed.city) params.set("city", parsed.city);

  // Budget from parser
  if (parsed.budget_max) params.set("budget_max", String(parsed.budget_max));

  // Furnished from parser
  if (parsed.furnished) params.set("furnished", "true");

  // Original query always preserved
  if (parsed.q) params.set("q", parsed.q);

  return params;
}
