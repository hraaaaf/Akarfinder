import yakeeyAudit from "../../data/audits/yakeey_price_reference_audit.json";

export type MarketBenchmarkSourceId = "yakeey";

export type MarketBenchmarkPropertyType = "appartement" | "villa";
export type MarketBenchmarkScope = "city" | "neighborhood";

export type MarketBenchmarkEntry = {
  benchmark_source: MarketBenchmarkSourceId;
  city: string;
  neighborhood: string | null;
  property_type: MarketBenchmarkPropertyType;
  benchmark_price_per_m2: number;
  /**
   * Legacy registry-row count. This is NOT the underlying number of market
   * transactions/listings used by the upstream benchmark and must never be
   * presented as a statistical sample size.
   */
  sample_count: number;
  /** Underlying statistical sample size, when explicitly published by source. */
  underlying_sample_size: number | null;
  /** Dispersion/variance measure, when explicitly published by source. */
  dispersion_pct: number | null;
  scope: MarketBenchmarkScope;
  source_url: string | null;
  /** When AkarFinder observed/audited this published reference. */
  benchmark_observed_at: string | null;
  /** Upstream source update timestamp, only when explicitly exposed by source. */
  source_updated_at: string | null;
  benchmark_method: "published_aggregated_reference";
  benchmark_transaction_type: "sale";
  market_segment_scope: "unsegmented";
  surface_band_scope: "unsegmented";
};

export type MarketBenchmarkLookupInput = {
  city?: string | null;
  neighborhood?: string | null;
  property_type?: string | null;
};

export type MarketBenchmarkMatch = MarketBenchmarkEntry & {
  match_key: string;
};

export type MarketBenchmarkRegistry = {
  benchmark_source: MarketBenchmarkSourceId;
  source_name: "Yakeey";
  source_type: "benchmark_source";
  not_listing_source: true;
  can_compute_market_benchmark: true;
  can_compute_price_gap: true;
  attribution_required: true;
  audit_observed_at: string | null;
  entries: MarketBenchmarkEntry[];
};

type AuditEntry = {
  city?: string;
  district?: string;
  city_url?: string | null;
  url: string | null;
  district_url?: string | null;
  source_page_url?: string | null;
  price_m2_appartement: number | null;
  price_m2_villa: number | null;
  price_m2_appartement_status: string;
  price_m2_villa_status: string;
  status: string;
};

type AuditJson = {
  run_at?: string;
  cities: AuditEntry[];
  districts: (AuditEntry & { city: string; city_url: string; district: string })[];
};

const YAKEEY_AUDIT = yakeeyAudit as unknown as AuditJson;

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "'")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePropertyType(value: string | null | undefined): MarketBenchmarkPropertyType | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (normalized === "villa") return "villa";
  if (normalized === "appartement" || normalized === "apartment" || normalized === "appartment") {
    return "appartement";
  }
  return null;
}

function commonBenchmarkMetadata(): Pick<
  MarketBenchmarkEntry,
  | "underlying_sample_size"
  | "dispersion_pct"
  | "benchmark_observed_at"
  | "source_updated_at"
  | "benchmark_method"
  | "benchmark_transaction_type"
  | "market_segment_scope"
  | "surface_band_scope"
> {
  return {
    // The audited public reference does not expose these statistical details.
    // Unknown stays null: never turn one registry row into a fake sample size.
    underlying_sample_size: null,
    dispersion_pct: null,
    benchmark_observed_at: YAKEEY_AUDIT.run_at ?? null,
    source_updated_at: null,
    benchmark_method: "published_aggregated_reference",
    benchmark_transaction_type: "sale",
    market_segment_scope: "unsegmented",
    surface_band_scope: "unsegmented",
  };
}

function buildEntries(): MarketBenchmarkEntry[] {
  const entries: MarketBenchmarkEntry[] = [];

  for (const cityRow of YAKEEY_AUDIT.cities) {
    if (cityRow.price_m2_appartement !== null) {
      entries.push({
        benchmark_source: "yakeey",
        city: cityRow.city ?? "",
        neighborhood: null,
        property_type: "appartement",
        benchmark_price_per_m2: cityRow.price_m2_appartement,
        sample_count: cityRow.price_m2_appartement_status === "available" ? 1 : 0,
        scope: "city",
        source_url: cityRow.url,
        ...commonBenchmarkMetadata(),
      });
    }
    if (cityRow.price_m2_villa !== null) {
      entries.push({
        benchmark_source: "yakeey",
        city: cityRow.city ?? "",
        neighborhood: null,
        property_type: "villa",
        benchmark_price_per_m2: cityRow.price_m2_villa,
        sample_count: cityRow.price_m2_villa_status === "available" ? 1 : 0,
        scope: "city",
        source_url: cityRow.url,
        ...commonBenchmarkMetadata(),
      });
    }
  }

  for (const districtRow of YAKEEY_AUDIT.districts) {
    const city = districtRow.city;
    const neighborhood = districtRow.district ?? null;
    if (districtRow.price_m2_appartement !== null) {
      entries.push({
        benchmark_source: "yakeey",
        city,
        neighborhood,
        property_type: "appartement",
        benchmark_price_per_m2: districtRow.price_m2_appartement,
        sample_count: 1,
        scope: "neighborhood",
        source_url: districtRow.url,
        ...commonBenchmarkMetadata(),
      });
    }
    if (districtRow.price_m2_villa !== null) {
      entries.push({
        benchmark_source: "yakeey",
        city,
        neighborhood,
        property_type: "villa",
        benchmark_price_per_m2: districtRow.price_m2_villa,
        sample_count: 1,
        scope: "neighborhood",
        source_url: districtRow.url,
        ...commonBenchmarkMetadata(),
      });
    }
  }

  return entries;
}

const MARKET_BENCHMARK_REGISTRY: MarketBenchmarkRegistry = {
  benchmark_source: "yakeey",
  source_name: "Yakeey",
  source_type: "benchmark_source",
  not_listing_source: true,
  can_compute_market_benchmark: true,
  can_compute_price_gap: true,
  attribution_required: true,
  audit_observed_at: YAKEEY_AUDIT.run_at ?? null,
  entries: buildEntries(),
};

const BENCHMARK_INDEX = new Map<string, MarketBenchmarkEntry>();

for (const entry of MARKET_BENCHMARK_REGISTRY.entries) {
  const key = entryKey(entry.city, entry.neighborhood, entry.property_type);
  if (!BENCHMARK_INDEX.has(key)) {
    BENCHMARK_INDEX.set(key, entry);
  }
}

function entryKey(city: string, neighborhood: string | null, propertyType: MarketBenchmarkPropertyType): string {
  return [normalizeText(city), normalizeText(neighborhood), propertyType].join("::");
}

export function getMarketBenchmarkRegistry(): MarketBenchmarkRegistry {
  return MARKET_BENCHMARK_REGISTRY;
}

export function findMarketBenchmark(
  input: MarketBenchmarkLookupInput
): MarketBenchmarkMatch | null {
  const city = normalizeText(input.city);
  const neighborhood = normalizeText(input.neighborhood);
  const propertyType = normalizePropertyType(input.property_type);
  if (!city || !propertyType) return null;

  if (neighborhood) {
    const neighborhoodMatch = BENCHMARK_INDEX.get(entryKey(city, neighborhood, propertyType));
    if (neighborhoodMatch) {
      return {
        ...neighborhoodMatch,
        match_key: entryKey(city, neighborhood, propertyType),
      };
    }
  }

  const cityMatch = BENCHMARK_INDEX.get(entryKey(city, null, propertyType));
  if (cityMatch) {
    return {
      ...cityMatch,
      match_key: entryKey(city, null, propertyType),
    };
  }

  return null;
}

export function listMarketBenchmarkEntries(): MarketBenchmarkEntry[] {
  return [...MARKET_BENCHMARK_REGISTRY.entries];
}

export function normalizeMarketBenchmarkPropertyType(
  value: string | null | undefined
): MarketBenchmarkPropertyType | null {
  return normalizePropertyType(value);
}
