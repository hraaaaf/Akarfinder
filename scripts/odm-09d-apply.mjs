import { readFileSync, writeFileSync } from "node:fs";

const path = "components/search/LightZillowSearchShell.tsx";
let source = readFileSync(path, "utf8");

function replaceOnce(label, before, after) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${label}: expected source block not found`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${label}: source block is not unique`);
  }
  source = source.replace(before, after);
}

replaceOnce(
  "gateway response type",
  `type ApiSearchResponse = {\n  listings: Listing[];\n  total: number;\n  limit: number;\n  offset: number;\n  next_cursor?: number | null;\n  has_more?: boolean;\n  source: string;\n  generated_at: string;\n};`,
  `type ApiSearchResponse = {\n  listings: Listing[];\n  total: number;\n  limit: number;\n  offset: number;\n  source: string;\n  generated_at: string;\n};\n\ntype GatewaySearchResponse = {\n  results: SearchGatewayNormalizedResult[];\n  total_count?: number;\n  next_cursor?: string | null;\n  has_more?: boolean;\n};`,
);

replaceOnce(
  "legacy URL cursor",
  `function buildSearchUrl(filters: ListingFiltersState, sortBy: SortBy, cursor?: number | null): string {`,
  `function buildSearchUrl(filters: ListingFiltersState, sortBy: SortBy): string {`,
);

replaceOnce(
  "legacy cursor query param",
  `  if (cursor != null) params.set("cursor", String(cursor));\n  return \`/api/search?\${params.toString()}\`;\n}`,
  `  return \`/api/search?\${params.toString()}\`;\n}\n\nfunction buildGatewayUrl(filters: ListingFiltersState, cursor?: string | null): string {\n  const params = new URLSearchParams({ limit: "100" });\n  if (filters.search.trim()) params.set("q", filters.search.trim());\n  if (filters.city !== "all") params.set("city", filters.city);\n  if (filters.propertyType !== "all") params.set("property_type", filters.propertyType);\n  if (filters.transactionType !== "all") params.set("intent", filters.transactionType);\n  if (filters.minBudget) params.set("min_price", filters.minBudget);\n  if (filters.maxBudget) params.set("max_price", filters.maxBudget);\n  if (filters.minSurface) params.set("min_surface", filters.minSurface);\n  if (cursor) params.set("cursor", cursor);\n  return \`/api/search/gateway?\${params.toString()}\`;\n}`,
);

replaceOnce(
  "cursor state",
  `  const [nextCursor, setNextCursor] = useState<number | null>(null);\n  const [hasMoreIndexed, setHasMoreIndexed] = useState(false);\n  const [isLoadingMore, setIsLoadingMore] = useState(false);\n\n  const [gatewayResults, setGatewayResults] = useState<SearchGatewayNormalizedResult[]>([]);\n  const gatewayEnabled = process.env.NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED === "true";\n  const [isGatewayLoading, setIsGatewayLoading] = useState(gatewayEnabled);`,
  `  const [nextCursor, setNextCursor] = useState<string | null>(null);\n  const [hasMoreIndexed, setHasMoreIndexed] = useState(false);\n  const [isLoadingMore, setIsLoadingMore] = useState(false);\n  const [indexedTotalCount, setIndexedTotalCount] = useState<number | null>(null);\n\n  const [gatewayResults, setGatewayResults] = useState<SearchGatewayNormalizedResult[]>([]);\n  const gatewayEnabled = process.env.NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED !== "false";\n  const [isGatewayLoading, setIsGatewayLoading] = useState(gatewayEnabled);`,
);

replaceOnce(
  "legacy first-page cursor assignment",
  `          setListings(payload.listings);\n          setNextCursor(payload.next_cursor ?? null);\n          setHasMoreIndexed(payload.has_more === true && payload.next_cursor != null);`,
  `          setListings(payload.listings);`,
);

const loadMoreStart = source.indexOf("  async function handleLoadMoreIndexed() {");
const gatewayEffectStart = source.indexOf("  useEffect(() => {\n    if (!gatewayEnabled)", loadMoreStart);
if (loadMoreStart < 0 || gatewayEffectStart < 0) {
  throw new Error("load-more/gateway effect boundaries not found");
}
source =
  source.slice(0, loadMoreStart) +
  `  async function handleLoadMoreIndexed() {\n    if (!nextCursor || isLoadingMore) return;\n    setIsLoadingMore(true);\n    try {\n      const response = await fetch(buildGatewayUrl(filters, nextCursor), { cache: "no-store" });\n      if (!response.ok) return;\n      const payload = (await response.json()) as GatewaySearchResponse;\n      if (!Array.isArray(payload.results)) return;\n      setGatewayResults((current) => {\n        const merged = new Map(\n          current.map((result) => [result.original_url || result.display_url || result.id, result]),\n        );\n        for (const result of payload.results) {\n          const key = result.original_url || result.display_url || result.id;\n          if (!merged.has(key)) merged.set(key, result);\n        }\n        return [...merged.values()];\n      });\n      setNextCursor(payload.next_cursor ?? null);\n      setHasMoreIndexed(payload.has_more === true && payload.next_cursor != null);\n      if (typeof payload.total_count === "number") setIndexedTotalCount(payload.total_count);\n    } catch {\n      // Preserve the current indexed page on transient failures.\n    } finally {\n      setIsLoadingMore(false);\n    }\n  }\n\n` +
  source.slice(gatewayEffectStart);

replaceOnce(
  "gateway disabled reset",
  `    if (!gatewayEnabled) {\n      setGatewayResults([]);\n      return;\n    }`,
  `    if (!gatewayEnabled) {\n      setGatewayResults([]);\n      setNextCursor(null);\n      setHasMoreIndexed(false);\n      setIndexedTotalCount(null);\n      setIsGatewayLoading(false);\n      return;\n    }`,
);

replaceOnce(
  "gateway request and payload",
  `        const params = new URLSearchParams();\n        if (filters.search.trim()) params.set("q", filters.search.trim());\n        if (filters.city !== "all") params.set("city", filters.city);\n        if (filters.propertyType !== "all") params.set("property_type", filters.propertyType);\n        if (filters.transactionType !== "all") params.set("intent", filters.transactionType);\n        const response = await fetch(\`/api/search/gateway?\${params.toString()}\`, { cache: "no-store" });\n        if (!response.ok || cancelled) {\n          setGatewayResults([]);\n          return;\n        }\n        const payload = await response.json();\n        if (!cancelled && Array.isArray(payload.results)) setGatewayResults(payload.results);`,
  `        const response = await fetch(buildGatewayUrl(filters), { cache: "no-store" });\n        if (!response.ok || cancelled) {\n          setGatewayResults([]);\n          setNextCursor(null);\n          setHasMoreIndexed(false);\n          setIndexedTotalCount(null);\n          return;\n        }\n        const payload = (await response.json()) as GatewaySearchResponse;\n        if (!cancelled && Array.isArray(payload.results)) {\n          setGatewayResults(payload.results);\n          setNextCursor(payload.next_cursor ?? null);\n          setHasMoreIndexed(payload.has_more === true && payload.next_cursor != null);\n          setIndexedTotalCount(typeof payload.total_count === "number" ? payload.total_count : null);\n        }`,
);

replaceOnce(
  "gateway catch reset",
  `      } catch {\n        if (!cancelled) setGatewayResults([]);\n      } finally {`,
  `      } catch {\n        if (!cancelled) {\n          setGatewayResults([]);\n          setNextCursor(null);\n          setHasMoreIndexed(false);\n          setIndexedTotalCount(null);\n        }\n      } finally {`,
);

replaceOnce(
  "gateway dependencies",
  `  }, [filters, gatewayEnabled]);`,
  `  }, [filters, gatewayEnabled]);`,
);

replaceOnce(
  "displayed result label",
  `                : \`\${displayedCount} résultat\${displayedCount !== 1 ? "s" : ""} affiché\${displayedCount !== 1 ? "s" : ""}\`}`,
  `                : indexedTotalCount != null\n                  ? \`\${displayedCount} affiché\${displayedCount !== 1 ? "s" : ""} sur \${indexedTotalCount.toLocaleString("fr-MA")} résultats indexés\`\n                  : \`\${displayedCount} résultat\${displayedCount !== 1 ? "s" : ""} affiché\${displayedCount !== 1 ? "s" : ""}\`}`,
);

replaceOnce(
  "load more telemetry",
  `                  onClick={handleLoadMoreIndexed}`,
  `                  onClick={() => {\n                    track({\n                      event_name: "search_index_load_more",\n                      source_page: "/search",\n                      intent: filters.transactionType,\n                      metadata: {\n                        city: filters.city,\n                        displayed_indexed_results: gatewayResults.length,\n                        indexed_total_count: indexedTotalCount,\n                      },\n                    });\n                    void handleLoadMoreIndexed();\n                  }}`,
);

writeFileSync(path, source);
console.log("ODM-09D search UI cursor patch applied");
