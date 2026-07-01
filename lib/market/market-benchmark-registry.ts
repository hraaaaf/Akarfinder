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
  sample_count: number;
  scope: MarketBenchmarkScope;
  source_url: string | null;
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
