from pathlib import Path
import re

path = Path("components/search/LightZillowSearchShell.tsx")
text = path.read_text()

text = text.replace(
    """type ApiSearchResponse = {
  listings: Listing[];
  total: number;
  limit: number;
  offset: number;
  next_cursor?: number | null;
  has_more?: boolean;
  source: string;
  generated_at: string;
};
""",
    """type ApiSearchResponse = {
  listings: Listing[];
  total: number;
  limit: number;
  offset: number;
  source: string;
  generated_at: string;
};

type GatewaySearchResponse = {
  results: SearchGatewayNormalizedResult[];
  total_count?: number;
  next_cursor?: string | null;
  has_more?: boolean;
};
""",
)

text = re.sub(
    r'function buildSearchUrl\(filters: ListingFiltersState, sortBy: SortBy, cursor\?: number \| null\): string \{(.*?)\n  if \(cursor != null\) params\.set\("cursor", String\(cursor\)\);\n  return `/api/search\?\$\{params\.toString\(\)\}`;\n\}',
    lambda match: "function buildSearchUrl(filters: ListingFiltersState, sortBy: SortBy): string {"
    + match.group(1)
    + '\n  return `/api/search?${params.toString()}`;\n}',
    text,
    flags=re.S,
)

gateway_builder = """
function buildGatewayUrl(filters: ListingFiltersState, cursor?: string | null): string {
  const params = new URLSearchParams({ limit: "100" });
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.city !== "all") params.set("city", filters.city);
  if (filters.propertyType !== "all") params.set("property_type", filters.propertyType);
  if (filters.transactionType !== "all") params.set("intent", filters.transactionType);
  if (filters.minBudget) params.set("min_price", filters.minBudget);
  if (filters.maxBudget) params.set("max_price", filters.maxBudget);
  if (filters.minSurface) params.set("min_surface", filters.minSurface);
  if (cursor) params.set("cursor", cursor);
  return `/api/search/gateway?${params.toString()}`;
}
"""
if "function buildGatewayUrl" not in text:
    text = text.replace("\nfunction getIntentLabel", gateway_builder + "\nfunction getIntentLabel")

text = text.replace(
    "const [nextCursor, setNextCursor] = useState<number | null>(null);",
    "const [nextCursor, setNextCursor] = useState<string | null>(null);",
)
text = text.replace(
    "const [isLoadingMore, setIsLoadingMore] = useState(false);",
    "const [isLoadingMore, setIsLoadingMore] = useState(false);\n  const [indexedTotalCount, setIndexedTotalCount] = useState<number | null>(null);",
)
text = text.replace(
    'const gatewayEnabled = process.env.NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED === "true";',
    'const gatewayEnabled = process.env.NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED !== "false";',
)
text = text.replace(
    """          setListings(payload.listings);
          setNextCursor(payload.next_cursor ?? null);
          setHasMoreIndexed(payload.has_more === true && payload.next_cursor != null);""",
    "          setListings(payload.listings);",
)

load_more = """  async function handleLoadMoreIndexed() {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const response = await fetch(buildGatewayUrl(filters, nextCursor), { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as GatewaySearchResponse;
      if (!Array.isArray(payload.results)) return;
      setGatewayResults((current) => {
        const merged = new Map(
          current.map((result) => [result.original_url || result.display_url || result.id, result]),
        );
        for (const result of payload.results) {
          const key = result.original_url || result.display_url || result.id;
          if (!merged.has(key)) merged.set(key, result);
        }
        return [...merged.values()];
      });
      setNextCursor(payload.next_cursor ?? null);
      setHasMoreIndexed(payload.has_more === true && payload.next_cursor != null);
      if (typeof payload.total_count === "number") setIndexedTotalCount(payload.total_count);
    } catch {
      // Preserve the current indexed page on transient failures.
    } finally {
      setIsLoadingMore(false);
    }
  }

"""
text, count = re.subn(
    r"  async function handleLoadMoreIndexed\(\) \{.*?\n  \}\n\n(?=  useEffect\(\(\) => \{\n    if \(!gatewayEnabled\))",
    load_more,
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit("Could not replace indexed load-more function")

gateway_effect = """  useEffect(() => {
    if (!gatewayEnabled) {
      setGatewayResults([]);
      setNextCursor(null);
      setHasMoreIndexed(false);
      setIndexedTotalCount(null);
      setIsGatewayLoading(false);
      return;
    }
    let cancelled = false;
    const delay = filters.search ? 300 : 0;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      setIsGatewayLoading(true);
      try {
        const response = await fetch(buildGatewayUrl(filters), { cache: "no-store" });
        if (!response.ok || cancelled) {
          setGatewayResults([]);
          setNextCursor(null);
          setHasMoreIndexed(false);
          setIndexedTotalCount(null);
          return;
        }
        const payload = (await response.json()) as GatewaySearchResponse;
        if (!cancelled && Array.isArray(payload.results)) {
          setGatewayResults(payload.results);
          setNextCursor(payload.next_cursor ?? null);
          setHasMoreIndexed(payload.has_more === true && payload.next_cursor != null);
          setIndexedTotalCount(typeof payload.total_count === "number" ? payload.total_count : null);
        }
      } catch {
        if (!cancelled) {
          setGatewayResults([]);
          setNextCursor(null);
          setHasMoreIndexed(false);
          setIndexedTotalCount(null);
        }
      } finally {
        if (!cancelled) setIsGatewayLoading(false);
      }
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filters, gatewayEnabled]);

"""
text, count = re.subn(
    r"  useEffect\(\(\) => \{\n    if \(!gatewayEnabled\).*?\n  \}, \[filters, gatewayEnabled\]\);\n\n(?=  const filteredListings)",
    gateway_effect,
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit("Could not replace gateway cursor effect")

if "void indexedTotalCount;" not in text:
    text = text.replace(
        "  const viewLayout = getSearchViewLayout(view);",
        "  const viewLayout = getSearchViewLayout(view);\n  void indexedTotalCount;",
    )

required = [
    "useCanonicalSearchSession",
    "SearchViewSwitcher",
    "buildGatewayUrl(filters, nextCursor)",
    "next_cursor?: string | null",
    "payload.total_count",
    'const gatewayEnabled = process.env.NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED !== "false"',
]
for token in required:
    if token not in text:
        raise SystemExit(f"Missing integrated token: {token}")

path.write_text(text)
