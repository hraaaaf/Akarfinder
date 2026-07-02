import type { SearchQuery } from "./types";

type SearchPageParams = Record<string, string | string[] | undefined>;

function pickFirst(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function normalizeTransactionType(raw?: string): SearchQuery["transaction_type"] {
  switch (raw) {
    case "rent":
    case "location":
      return "rent";
    case "new":
    case "neuf":
      return "new";
    case "buy":
    case "sale":
    case "achat":
      return "buy";
    default:
      return undefined;
  }
}

export function buildSearchPageQuery(searchParams: SearchPageParams): SearchQuery {
  const query: SearchQuery = {
    limit: 100,
    offset: 0,
  };

  const search = pickFirst(searchParams.q);
  if (search?.trim()) query.q = search.trim();

  const city = pickFirst(searchParams.city);
  if (city && city !== "all") query.city = city;

  const propertyType = pickFirst(searchParams.property_type);
  if (propertyType && propertyType !== "all") query.property_type = propertyType;

  const transactionType = normalizeTransactionType(
    pickFirst(searchParams.type) ?? pickFirst(searchParams.transaction_type)
  );
  if (transactionType) query.transaction_type = transactionType;

  return query;
}
