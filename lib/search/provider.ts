export type SearchProvider = "database" | "typesense";

export function getSearchProvider(): SearchProvider {
  return process.env.SEARCH_PROVIDER === "typesense" ? "typesense" : "database";
}

export function isTypesenseConfigured(): boolean {
  return !!(
    process.env.TYPESENSE_HOST &&
    process.env.TYPESENSE_PORT &&
    process.env.TYPESENSE_PROTOCOL &&
    process.env.TYPESENSE_API_KEY &&
    process.env.TYPESENSE_COLLECTION
  );
}

export function useTypesenseSearch(): boolean {
  return getSearchProvider() === "typesense" && isTypesenseConfigured();
}
