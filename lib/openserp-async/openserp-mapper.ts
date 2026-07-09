import { inferPublicPropertyIndexAttributes, normalizePublicPropertyIndexRecord, sanitizePublicPropertyIndexSnippet } from "@/lib/public-property-index/normalize-index-record";
import { assertOpenSerpRawResultSafety } from "./openserp-public-safety";
import type { OpenSerpMappedRecord, OpenSerpRawResult, OpenSerpSearchResponse, OpenSerpMapperHints } from "./types";

function toSourceUrl(result: OpenSerpRawResult): string {
  return (result.url ?? result.link ?? "").trim();
}

function toSourceHost(result: OpenSerpRawResult, fallback?: string): string {
  if (result.source_host?.trim()) return result.source_host.trim();
  if (fallback?.trim()) return fallback.trim();
  try {
    return new URL(toSourceUrl(result)).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function toNumber(value: number | string | undefined): number | undefined {
  if (value == null) return undefined;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : undefined;
}

export function mapOpenSerpRawResultToPublicPropertyIndexRecord(
  result: OpenSerpRawResult,
  hints: OpenSerpMapperHints,
): OpenSerpMappedRecord | null {
  assertOpenSerpRawResultSafety(result);

  const sourceUrl = toSourceUrl(result);
  if (!sourceUrl) return null;

  const inferred = inferPublicPropertyIndexAttributes({
    title: result.title,
    short_snippet: result.snippet,
    source_url: sourceUrl,
  });

  return normalizePublicPropertyIndexRecord({
    source_url: sourceUrl,
    source_host: toSourceHost(result, hints.source_host ?? inferred.source_host),
    title: (result.title ?? "").trim() || "Résultat public observé",
    short_snippet: sanitizePublicPropertyIndexSnippet(result.snippet),
    inferred_city: hints.inferred_city ?? inferred.inferred_city,
    inferred_neighborhood: hints.inferred_neighborhood ?? inferred.inferred_neighborhood,
    inferred_property_type: hints.inferred_property_type ?? inferred.inferred_property_type,
    inferred_transaction_type: hints.inferred_transaction_type ?? inferred.inferred_transaction_type,
    public_price: toNumber(result.price) ?? inferred.public_price,
    public_surface: toNumber(result.surface) ?? inferred.public_surface,
    result_source: hints.result_source ?? "openserp_async_poc",
    provider_engine: hints.provider_engine ?? hints.engine,
    observed_at: hints.observed_at,
  });
}

export function mapOpenSerpSearchResponseToPublicPropertyIndexRecords(
  response: OpenSerpSearchResponse,
  hints: Omit<OpenSerpMapperHints, "engine" | "provider_engine"> & { provider_engine?: OpenSerpMapperHints["provider_engine"] },
): OpenSerpMappedRecord[] {
  return response.results
    .map((result) =>
      mapOpenSerpRawResultToPublicPropertyIndexRecord(result, {
        engine: response.engine,
        query: response.query,
        provider_engine: hints.provider_engine ?? response.engine,
        observed_at: hints.observed_at,
        result_source: hints.result_source ?? "openserp_async_poc",
        source_host: hints.source_host,
        inferred_city: hints.inferred_city,
        inferred_neighborhood: hints.inferred_neighborhood,
        inferred_property_type: hints.inferred_property_type,
        inferred_transaction_type: hints.inferred_transaction_type,
      }),
    )
    .filter((record): record is OpenSerpMappedRecord => Boolean(record));
}

export function buildOpenSerpPublicIndexQueryLabel(query: string): string {
  const normalized = query.trim();
  return normalized.length > 0 ? `Résultats publics observés · ${normalized}` : "Résultats publics observés";
}
