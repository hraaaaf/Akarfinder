// Normalize raw property-type and transaction-type labels.

import type { PropertyTypeP0, TransactionTypeP0 } from "../types";

export function normalizeType(raw: string | null | undefined): PropertyTypeP0 {
  if (raw == null) return "unknown";
  const s = String(raw).toLowerCase();

  if (/appartement|appart\b|apartment|flat|studio|duplex/.test(s)) return "apartment";
  if (/villa|riad|maison|house|townhouse/.test(s)) return "villa";
  if (/terrain|land|lot\b|parcelle|ferme|farm/.test(s)) return "land";
  if (/bureau|local|office|plateau|commerce|magasin|shop|depot/.test(s)) return "office";

  return "unknown";
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
