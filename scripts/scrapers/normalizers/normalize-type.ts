// Normalize raw property-type and transaction-type labels.

import type { PropertyTypeP0, TransactionTypeP0 } from "../types";

export function normalizeType(raw: string | null | undefined): PropertyTypeP0 {
  if (raw == null) return "unknown";
  const s = String(raw).toLowerCase();

  const candidates: Array<{ type: PropertyTypeP0; index: number }> = [];
  const patterns: Array<[PropertyTypeP0, RegExp]> = [
    ["apartment", /appartement|appart\b|apartment|flat|studio|duplex/],
    ["land", /terrain|land|lot\b|parcelle|ferme|farm/],
    ["riad", /riad/],
    ["villa", /villa|maison|house|townhouse/],
    ["office", /bureau|local|office|plateau|commerce|magasin|shop|depot/],
  ];

  for (const [type, pattern] of patterns) {
    const match = pattern.exec(s);
    if (match?.index != null) candidates.push({ type, index: match.index });
  }

  candidates.sort((a, b) => a.index - b.index);
  return candidates[0]?.type ?? "unknown";
}

export function normalizeTransaction(
  raw: string | null | undefined,
  fallbackText?: string | null
): TransactionTypeP0 {
  const s = `${raw ?? ""} ${fallbackText ?? ""}`.toLowerCase();
  if (!s.trim()) return "unknown";

  if (/(à|a)\s*louer|location|rent|lease|loyer|\/\s*mois|par mois|mensuel/.test(s)) return "rent";
  if (/(à|a)\s*vendre|vente|sale|sell|achat|buy|for sale/.test(s)) return "sale";

  return "unknown";
}
