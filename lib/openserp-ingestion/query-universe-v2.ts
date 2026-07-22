import { createHash } from "node:crypto";
import { loadSourceDomainRegistry } from "./domain-registry";
import {
  TIER_1_CITIES,
  TIER_2_CITIES,
  TIER_3_DISTRICTS,
  CITY_ARABIC_NAMES,
  PROPERTY_TYPE_ARABIC_NAMES,
  getCityTier,
} from "./national-geography";
import type { StaticQueryDefinition } from "./state/serverless-state-service";

export const QUERY_UNIVERSE_V2_VERSION = "openserp-query-universe-v2";

const PROPERTY_TYPES = [
  "appartement", "studio", "villa", "maison", "terrain", "riad",
  "bureau", "local commercial", "magasin", "ferme", "immeuble", "duplex",
] as const;

const SOURCE_PROPERTY_TYPES = ["appartement", "villa", "terrain", "bureau"] as const;
const ENGINES = ["duckduckgo", "ecosia", "bing"] as const;

type Tx = "sale" | "rent";
type Lang = "fr" | "ar";
type Variant = "core" | "intent_first" | "immobilier_longtail";

export type QueryUniverseV2Item = StaticQueryDefinition & {
  normalized_query: string;
  query_hash: string;
  variant: Variant;
};

export type QueryUniverseV2 = {
  universe_version: typeof QUERY_UNIVERSE_V2_VERSION;
  total_queries: number;
  cities_covered: number;
  districts_covered: number;
  queries: QueryUniverseV2Item[];
};

function sha256(v: string) {
  return createHash("sha256").update(v, "utf8").digest("hex");
}

function normalize(v: string) {
  return v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

function txText(tx: Tx, lang: Lang, variant: Variant) {
  if (lang === "ar") {
    if (tx === "sale") return variant === "intent_first" ? "بيع" : "للبيع";
    return variant === "intent_first" ? "كراء" : "للإيجار";
  }
  if (tx === "sale") return variant === "core" ? "a vendre" : variant === "intent_first" ? "vente" : "immobilier vente";
  return variant === "core" ? "a louer" : variant === "intent_first" ? "location" : "immobilier location";
}

function renderQuery(input: {
  city: string; district: string | null; tx: Tx; propertyType: string; lang: Lang;
  variant: Variant; targetDomain: string | null;
}) {
  const city = input.lang === "ar" ? (CITY_ARABIC_NAMES[input.city] ?? input.city) : input.city;
  const property = input.lang === "ar" ? (PROPERTY_TYPE_ARABIC_NAMES[input.propertyType] ?? input.propertyType) : input.propertyType;
  const intent = txText(input.tx, input.lang, input.variant);
  const place = `${city}${input.district ? ` ${input.district}` : ""}`;
  let base: string;
  if (input.variant === "intent_first") base = `${intent} ${property} ${place}`;
  else if (input.variant === "immobilier_longtail" && input.lang === "fr") base = `${property} ${place} ${intent}`;
  else base = `${property} ${intent} ${place}`;
  return input.targetDomain ? `${base} site:${input.targetDomain}` : base;
}

function make(input: {
  city: string; district: string | null; tx: Tx; propertyType: string; lang: Lang;
  variant: Variant; priority: 1|2|3|4; targetDomain: string | null;
  family: "general" | "brand_hint"; rotationIndex: number;
}): QueryUniverseV2Item {
  const query_text = renderQuery(input);
  const idSeed = [input.city, input.district ?? "", input.tx, input.propertyType, input.lang, input.variant, input.targetDomain ?? ""].join("::");
  return {
    query_id: `nqu2-${sha256(idSeed).slice(0, 16)}`,
    city: input.city,
    district: input.district,
    priority_tier: input.priority,
    transaction: input.tx,
    property_type: input.propertyType,
    language: input.lang,
    preferred_engine: ENGINES[input.rotationIndex % ENGINES.length],
    query_text,
    target_domain: input.targetDomain,
    query_family: input.family,
    normalized_query: normalize(query_text),
    query_hash: sha256(`openserp-v2::${normalize(query_text)}`),
    variant: input.variant,
  };
}

export function buildQueryUniverseV2(): QueryUniverseV2 {
  const out: QueryUniverseV2Item[] = [];
  let rotationIndex = 0;
  const variants: Variant[] = ["core", "intent_first", "immobilier_longtail"];

  for (const city of [...TIER_1_CITIES, ...TIER_2_CITIES]) {
    const cityTier = getCityTier(city) ?? 2;
    for (const propertyType of PROPERTY_TYPES) for (const tx of ["sale", "rent"] as Tx[]) for (const lang of ["fr", "ar"] as Lang[]) {
      for (const variant of variants) {
        if (lang === "ar" && variant === "immobilier_longtail") continue;
        out.push(make({ city, district:null, tx, propertyType, lang, variant, priority: cityTier === 1 ? 1 : 2, targetDomain:null, family:"general", rotationIndex: rotationIndex++ }));
      }
    }
  }

  for (const [city, districts] of Object.entries(TIER_3_DISTRICTS)) for (const district of districts) {
    for (const propertyType of PROPERTY_TYPES) for (const tx of ["sale", "rent"] as Tx[]) for (const variant of variants) {
      out.push(make({ city, district, tx, propertyType, lang:"fr", variant, priority:3, targetDomain:null, family:"general", rotationIndex: rotationIndex++ }));
    }
  }

  const registry = loadSourceDomainRegistry();
  const approved = registry.domains.filter((d) => ["approved_discovery", "partner", "authorized_static"].includes(d.status));
  for (const entry of approved) {
    const cities = entry.coverage_cities?.length ? entry.coverage_cities : TIER_1_CITIES;
    for (const city of cities) for (const propertyType of SOURCE_PROPERTY_TYPES) for (const tx of ["sale", "rent"] as Tx[]) {
      out.push(make({ city, district:null, tx, propertyType, lang:"fr", variant:"core", priority:4, targetDomain:entry.domain, family:"brand_hint", rotationIndex: rotationIndex++ }));
    }
  }

  const deduped = [...new Map(out.map((q) => [q.normalized_query, q])).values()];
  return {
    universe_version: QUERY_UNIVERSE_V2_VERSION,
    total_queries: deduped.length,
    cities_covered: new Set(deduped.map((q) => q.city)).size,
    districts_covered: new Set(deduped.filter((q) => q.district).map((q) => `${q.city}::${q.district}`)).size,
    queries: deduped,
  };
}
