import { createHash } from "node:crypto";
import { loadSourceDomainRegistry } from "./domain-registry";
import {
  TIER_1_CITIES,
  TIER_2_CITIES,
  ACQUISITION_EXPANSION_CITIES,
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
const SOURCE_EXTRA_PROPERTY_TYPES = ["villa", "terrain", "bureau"] as const;
const ENGINES = ["duckduckgo", "ecosia", "bing"] as const;
const LEGACY_CITY_LEVEL_CITIES = [...TIER_1_CITIES, ...TIER_2_CITIES] as const;
const NATIONAL_ACQUISITION_CITIES = [...LEGACY_CITY_LEVEL_CITIES, ...ACQUISITION_EXPANSION_CITIES] as const;

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

function coreTxText(tx: Tx, lang: Lang) {
  if (lang === "ar") return tx === "sale" ? "للبيع" : "كراء";
  return tx === "sale" ? "a vendre" : "a louer";
}

function variantTxText(tx: Tx, lang: Lang, variant: Exclude<Variant, "core">) {
  if (lang === "ar") return tx === "sale" ? "بيع" : "للإيجار";
  if (tx === "sale") return variant === "intent_first" ? "vente" : "immobilier vente";
  return variant === "intent_first" ? "location" : "immobilier location";
}

function labels(cityName: string, propertyType: string, lang: Lang) {
  return {
    city: lang === "ar" ? (CITY_ARABIC_NAMES[cityName] ?? cityName) : cityName,
    property: lang === "ar" ? (PROPERTY_TYPE_ARABIC_NAMES[propertyType] ?? propertyType) : propertyType,
  };
}

function makeCore(input: {
  city: string; district: string | null; tx: Tx; propertyType: string; lang: Lang;
  priority: 1|2|3|4; targetDomain: string | null; family: "general" | "brand_hint";
  rotationIndex: number;
}): QueryUniverseV2Item {
  const l = labels(input.city, input.propertyType, input.lang);
  const district = input.district ? ` ${input.district}` : "";
  const query_text = input.targetDomain
    ? `${input.propertyType} ${coreTxText(input.tx, input.lang)} ${l.city} site:${input.targetDomain}`
    : `${l.property} ${coreTxText(input.tx, input.lang)} ${l.city}${district}`;
  const idSeed = `${input.city}::${input.district ?? ""}::${input.tx}::${input.propertyType}::${input.lang}::${input.targetDomain ?? ""}`;
  return {
    query_id: `nqu1-${sha256(idSeed).slice(0, 16)}`,
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
    query_hash: sha256(`openserp::${normalize(query_text)}`),
    variant: "core",
  };
}

function makeAddedVariant(input: {
  city: string; district: string | null; tx: Tx; propertyType: string; lang: Lang;
  variant: Exclude<Variant, "core">; priority: 1|2|3|4; targetDomain: string | null;
  family: "general" | "brand_hint"; rotationIndex: number;
}): QueryUniverseV2Item {
  const l = labels(input.city, input.propertyType, input.lang);
  const place = `${l.city}${input.district ? ` ${input.district}` : ""}`;
  const intent = variantTxText(input.tx, input.lang, input.variant);
  const base = input.variant === "intent_first"
    ? `${intent} ${l.property} ${place}`
    : `${l.property} ${place} ${intent}`;
  const query_text = input.targetDomain ? `${base} site:${input.targetDomain}` : base;
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
  const registry = loadSourceDomainRegistry();
  const approved = registry.domains.filter((d) => ["approved_discovery", "partner", "authorized_static"].includes(d.status));

  // Legacy core first, in exactly V1 generation order. These rows deliberately
  // keep nqu1 IDs, query text, hashes and preferred-engine rotation so existing
  // PostgreSQL rotation/yield history carries forward instead of resetting.
  for (const city of LEGACY_CITY_LEVEL_CITIES) {
    const cityTier = getCityTier(city) ?? 2;
    for (const propertyType of PROPERTY_TYPES) for (const tx of ["sale", "rent"] as Tx[]) for (const lang of ["fr", "ar"] as Lang[]) {
      out.push(makeCore({ city, district:null, tx, propertyType, lang, priority:cityTier === 1 ? 1 : 2, targetDomain:null, family:"general", rotationIndex:rotationIndex++ }));
    }
  }
  for (const [city, districts] of Object.entries(TIER_3_DISTRICTS)) for (const district of districts) {
    for (const propertyType of PROPERTY_TYPES) for (const tx of ["sale", "rent"] as Tx[]) {
      out.push(makeCore({ city, district, tx, propertyType, lang:"fr", priority:3, targetDomain:null, family:"general", rotationIndex:rotationIndex++ }));
    }
  }
  for (const entry of approved) {
    const cities = entry.coverage_cities?.length ? entry.coverage_cities : TIER_1_CITIES;
    for (const city of cities) for (const tx of ["sale", "rent"] as Tx[]) {
      out.push(makeCore({ city, district:null, tx, propertyType:"appartement", lang:"fr", priority:4, targetDomain:entry.domain, family:"brand_hint", rotationIndex:rotationIndex++ }));
    }
  }

  // Additive long-tail variants. This now covers the broader national
  // acquisition city set. Existing cities keep their existing nqu2 identities;
  // expansion cities receive only new nqu2 identities, never fake legacy nqu1s.
  for (const city of NATIONAL_ACQUISITION_CITIES) {
    const cityTier = getCityTier(city) ?? 2;
    for (const propertyType of PROPERTY_TYPES) for (const tx of ["sale", "rent"] as Tx[]) {
      out.push(makeAddedVariant({ city, district:null, tx, propertyType, lang:"fr", variant:"intent_first", priority:cityTier === 1 ? 1 : 2, targetDomain:null, family:"general", rotationIndex:rotationIndex++ }));
      out.push(makeAddedVariant({ city, district:null, tx, propertyType, lang:"fr", variant:"immobilier_longtail", priority:cityTier === 1 ? 1 : 2, targetDomain:null, family:"general", rotationIndex:rotationIndex++ }));
      out.push(makeAddedVariant({ city, district:null, tx, propertyType, lang:"ar", variant:"intent_first", priority:cityTier === 1 ? 1 : 2, targetDomain:null, family:"general", rotationIndex:rotationIndex++ }));
    }
  }
  for (const [city, districts] of Object.entries(TIER_3_DISTRICTS)) for (const district of districts) {
    for (const propertyType of PROPERTY_TYPES) for (const tx of ["sale", "rent"] as Tx[]) {
      out.push(makeAddedVariant({ city, district, tx, propertyType, lang:"fr", variant:"intent_first", priority:3, targetDomain:null, family:"general", rotationIndex:rotationIndex++ }));
      out.push(makeAddedVariant({ city, district, tx, propertyType, lang:"fr", variant:"immobilier_longtail", priority:3, targetDomain:null, family:"general", rotationIndex:rotationIndex++ }));
    }
  }
  for (const entry of approved) {
    const cities = entry.coverage_cities?.length ? entry.coverage_cities : TIER_1_CITIES;
    for (const city of cities) for (const propertyType of SOURCE_EXTRA_PROPERTY_TYPES) for (const tx of ["sale", "rent"] as Tx[]) {
      const added = makeAddedVariant({ city, district:null, tx, propertyType, lang:"fr", variant:"intent_first", priority:4, targetDomain:entry.domain, family:"brand_hint", rotationIndex:rotationIndex++ });
      added.query_text = `${propertyType} ${coreTxText(tx, "fr")} ${city} site:${entry.domain}`;
      added.normalized_query = normalize(added.query_text);
      added.query_hash = sha256(`openserp-v2::${added.normalized_query}`);
      out.push(added);
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