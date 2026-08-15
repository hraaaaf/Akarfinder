export type IndicativePriceInput = {
  domain: string;
  title?: string | null;
  snippet?: string | null;
  intent?: string | null;
};

const MONEY_PATTERN = /([0-9]{1,3}(?:[ .][0-9]{3})+|[0-9]{4,9})(?:[.,]00)?\s*(?:dh|dhs|mad|dirhams?)/gi;
const PER_M2_PATTERN = /(?:dh|dhs|mad|dirhams?)\s*(?:\/|par|le)\s*m(?:²|2)\b/i;
const SHORT_STAY_PATTERN = /(?:par[-_ ]?jour|par\s+nuit|nuit[eé]e|journalier|journali[eè]re|per day|daily)/i;

function parseAmount(raw: string): number | null {
  const value = Number(raw.replace(/[^0-9]/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function normalizedIntent(intent?: string | null): "sale" | "rent" | null {
  if (["buy", "sale", "new", "achat", "neuf"].includes(intent ?? "")) return "sale";
  if (["rent", "location"].includes(intent ?? "")) return "rent";
  return null;
}

function plausible(amount: number, intent: "sale" | "rent" | null): boolean {
  if (amount > 500_000_000) return false;
  if (intent === "sale" && amount < 10_000) return false;
  if (intent === "rent" && amount < 1_000) return false;
  return true;
}

export function deriveIndicativePriceMad(input: IndicativePriceInput): number | null {
  if (input.domain.replace(/^www\./, "").toLowerCase() !== "agenz.ma") return null;

  const text = `${input.title ?? ""} ${input.snippet ?? ""}`.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  if (!text || PER_M2_PATTERN.test(text) || SHORT_STAY_PATTERN.test(text)) return null;

  const intent = normalizedIntent(input.intent);
  const unique = new Set<number>();
  for (const match of text.matchAll(MONEY_PATTERN)) {
    const amount = parseAmount(match[1] ?? "");
    if (amount != null && plausible(amount, intent)) unique.add(amount);
    if (unique.size > 1) return null;
  }

  return unique.size === 1 ? [...unique][0] : null;
}
