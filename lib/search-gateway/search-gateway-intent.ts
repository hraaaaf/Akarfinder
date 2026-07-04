// SEARCH-GATEWAY-INTENT-TEST-HARDENING-1
// Detects buy/rent/new transaction-intent signals in a result's title/URL so
// ranking can favor the route intent (/acheter, /louer, /neuf) without ever
// removing non-matching results — deprioritize only, coverage is preserved.

export type SearchGatewayRouteIntent = "buy" | "rent" | "new";

const BUY_SIGNALS: ReadonlyArray<string> = [
  "acheter",
  "vente",
  "à vendre",
  "a vendre",
  "for sale",
  "achat",
  "acquisition",
  "/acheter",
  "/vente",
  "sale",
];

const RENT_SIGNALS: ReadonlyArray<string> = [
  "louer",
  "location",
  "rent",
  "for rent",
  "bail",
  "/louer",
  "/location",
];

const NEW_SIGNALS: ReadonlyArray<string> = [
  "neuf",
  "programme neuf",
  "projet neuf",
  "promoteur",
  "résidence neuve",
  "residence neuve",
  "immobilier neuf",
  "new development",
  "new project",
  "off-plan",
  "off plan",
  "livraison",
  "standing neuf",
  "nouveau programme",
];

function matchesAny(text: string, signals: ReadonlyArray<string>): boolean {
  return signals.some((signal) => text.includes(signal));
}

export function hasBuySignal(title: string, url: string): boolean {
  return matchesAny(`${title} ${url}`.toLowerCase(), BUY_SIGNALS);
}

export function hasRentSignal(title: string, url: string): boolean {
  return matchesAny(`${title} ${url}`.toLowerCase(), RENT_SIGNALS);
}

export function hasNewSignal(title: string, url: string): boolean {
  return matchesAny(`${title} ${url}`.toLowerCase(), NEW_SIGNALS);
}

/**
 * Score contribution for matching (or conflicting with) the route intent.
 * Positive when the result matches the requested intent, negative when it
 * clearly matches the opposite transaction type, zero otherwise. Never
 * reduces a score below what scoreQuality's Math.max(score, 0) floor allows,
 * and never causes a result to be dropped — only reordered.
 */
export function scoreIntentMatch(
  title: string,
  url: string,
  intent: SearchGatewayRouteIntent | undefined
): number {
  if (!intent) return 0;

  const buy = hasBuySignal(title, url);
  const rent = hasRentSignal(title, url);
  const isNew = hasNewSignal(title, url);

  if (intent === "buy") {
    if (buy) return 18;
    if (rent) return -10;
    return 0;
  }

  if (intent === "rent") {
    if (rent) return 18;
    if (buy) return -10;
    return 0;
  }

  // intent === "new"
  if (isNew) return 18;
  if (!buy && !rent && !isNew) return -4; // generic page with no transaction signal at all
  return 0;
}

export function parseRouteIntent(value: string | null | undefined): SearchGatewayRouteIntent | undefined {
  if (value === "buy" || value === "rent" || value === "new") return value;
  return undefined;
}
