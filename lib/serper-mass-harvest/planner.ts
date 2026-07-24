import { createHash } from "node:crypto";
import type { HarvestQuery, HarvestQueryMetrics, HarvestSourceId } from "./types";

export const HARVEST_HARD_CAP = 2000;
export const FIXED_QUERY_BUDGET = 900;
export const ADAPTIVE_QUERY_BUDGET = 700;
export const DISCOVERY_QUERY_BUDGET = 250;
export const REFRESH_QUERY_BUDGET = 150;

const CITIES = [
  "Casablanca",
  "Rabat",
  "Marrakech",
  "Tanger",
  "Agadir",
  "Fes",
  "Meknes",
  "Kenitra",
  "Tetouan",
  "Oujda",
  "El Jadida",
  "Mohammedia",
  "Beni Mellal",
  "Nador",
  "Sale",
] as const;

const PROPERTY_TYPES = [
  "appartement",
  "villa",
  "maison",
  "terrain",
  "riad",
  "bureau",
  "local commercial",
  "ferme",
] as const;

const SOURCE_ALLOCATIONS: ReadonlyArray<{
  source_id: Exclude<HarvestSourceId, "long_tail">;
  domain: string;
  budget: number;
}> = [
  { source_id: "mubawab", domain: "mubawab.ma", budget: 160 },
  { source_id: "avito", domain: "avito.ma", budget: 140 },
  { source_id: "sarouty", domain: "sarouty.ma", budget: 120 },
  { source_id: "agenz", domain: "agenz.ma", budget: 90 },
  { source_id: "1immo", domain: "1immo.ma", budget: 80 },
  { source_id: "mouldar", domain: "mouldar.com", budget: 70 },
  { source_id: "sakane", domain: "sakane.ma", budget: 60 },
  { source_id: "dabaannonce", domain: "dabaannonce.ma", budget: 60 },
  { source_id: "souqcity", domain: "souqcity.ma", budget: 40 },
  { source_id: "afribaba", domain: "ma.afribaba.com", budget: 30 },
  { source_id: "darkom", domain: "darkom.ma", budget: 20 },
  { source_id: "soukimmobilier", domain: "soukimmobilier.com", budget: 15 },
  { source_id: "masaken", domain: "masaken.ma", budget: 15 },
];

const AVITO_CATEGORY_BY_TYPE: Record<string, string> = {
  appartement: "appartements",
  villa: "villas_et_riads",
  maison: "maisons",
  terrain: "terrains_et_fermes",
  riad: "villas_et_riads",
  bureau: "bureaux",
  "local commercial": "local",
  ferme: "terrains_et_fermes",
};

function idFor(parts: string[]): string {
  return createHash("sha256").update(parts.join("|"), "utf8").digest("hex").slice(0, 20);
}

function intentTerm(intent: "sale" | "rent"): string {
  return intent === "sale" ? "a vendre" : "a louer";
}

function renderSourceQuery(input: {
  source_id: Exclude<HarvestSourceId, "long_tail">;
  domain: string;
  city: string;
  property_type: string;
  intent: "sale" | "rent";
  variant: number;
}): string {
  const intent = intentTerm(input.intent);
  const base = `${input.property_type} ${input.city} ${intent}`;

  switch (input.source_id) {
    case "mubawab":
      return input.variant % 2 === 0
        ? `site:mubawab.ma/fr/a/ ${base}`
        : `site:mubawab.ma/en/a/ ${input.property_type} ${input.city} ${input.intent === "sale" ? "for sale" : "for rent"}`;
    case "avito": {
      const category = AVITO_CATEGORY_BY_TYPE[input.property_type] ?? "immobilier";
      return `site:avito.ma/fr/ inurl:${category} ${input.property_type} ${input.city} ${intent}`;
    }
    case "sarouty":
      return input.intent === "sale"
        ? `site:sarouty.ma/plp/acheter/ ${input.property_type} ${input.city}`
        : `site:sarouty.ma ${base}`;
    case "agenz":
      return `site:agenz.ma/fr/annonces/ ${base}`;
    case "mouldar":
      return `site:mouldar.com/${input.intent === "sale" ? "fr/achat" : "fr/location"}/ ${input.property_type} ${input.city}`;
    default:
      return `site:${input.domain} ${base}`;
  }
}

export function buildFixedHarvestQueries(): HarvestQuery[] {
  const output: HarvestQuery[] = [];

  for (const source of SOURCE_ALLOCATIONS) {
    const candidates: HarvestQuery[] = [];
    let variant = 0;
    for (const city of CITIES) {
      for (const propertyType of PROPERTY_TYPES) {
        for (const intent of ["sale", "rent"] as const) {
          const query = renderSourceQuery({
            source_id: source.source_id,
            domain: source.domain,
            city,
            property_type: propertyType,
            intent,
            variant,
          });
          candidates.push({
            id: idFor(["fixed", source.source_id, city, propertyType, intent, String(variant)]),
            phase: "fixed",
            source_id: source.source_id,
            query,
            city,
            property_type: propertyType,
            intent,
          });
          variant += 1;
        }
      }
    }
    output.push(...candidates.slice(0, source.budget));
  }

  if (output.length !== FIXED_QUERY_BUDGET) {
    throw new Error(`fixed harvest plan invariant failed: expected ${FIXED_QUERY_BUDGET}, got ${output.length}`);
  }
  return output;
}

export function buildDiscoveryHarvestQueries(): HarvestQuery[] {
  const exclusions = [
    "-site:avito.ma",
    "-site:mubawab.ma",
    "-site:sarouty.ma",
    "-site:agenz.ma",
  ].join(" ");
  const output: HarvestQuery[] = [];
  let index = 0;

  for (const city of CITIES) {
    for (const propertyType of PROPERTY_TYPES) {
      for (const intent of ["sale", "rent"] as const) {
        const intentText = intentTerm(intent);
        const query = index % 5 === 0
          ? `"agence immobiliere" ${city} ${propertyType} ${intentText} ${exclusions}`
          : index % 7 === 0
            ? `"promoteur immobilier" ${city} ${propertyType} ${exclusions}`
            : `"${propertyType} ${intentText}" ${city} immobilier ${exclusions}`;
        output.push({
          id: idFor(["discovery", city, propertyType, intent, String(index)]),
          phase: "discovery",
          source_id: "long_tail",
          query,
          city,
          property_type: propertyType,
          intent,
        });
        index += 1;
      }
    }
  }

  const supplemental = [
    "Casablanca",
    "Rabat",
    "Marrakech",
    "Tanger",
    "Agadir",
    "Fes",
    "Meknes",
    "Kenitra",
    "Tetouan",
    "Oujda",
  ];
  for (const city of supplemental) {
    if (output.length >= DISCOVERY_QUERY_BUDGET) break;
    const query = `"annonce immobiliere" ${city} agence promoteur ${exclusions}`;
    output.push({
      id: idFor(["discovery-supplemental", city]),
      phase: "discovery",
      source_id: "long_tail",
      query,
      city,
    });
  }

  if (output.length !== DISCOVERY_QUERY_BUDGET) {
    throw new Error(`discovery harvest plan invariant failed: expected ${DISCOVERY_QUERY_BUDGET}, got ${output.length}`);
  }
  return output;
}

function adaptiveVariantQueries(metric: HarvestQueryMetrics): HarvestQuery[] {
  const parent = metric.query;
  const maximum = metric.accepted_results >= 5 ? 4 : metric.accepted_results >= 3 ? 2 : metric.accepted_results >= 1 ? 1 : 0;
  if (maximum === 0 || !parent.city || !parent.property_type || !parent.intent) return [];
  if (metric.category_or_noise_results > Math.max(4, metric.raw_results / 2)) return [];
  if (metric.raw_results > 0 && metric.duplicate_results / metric.raw_results > 0.7) return [];

  const variants = [
    parent.query.replace(/\ba vendre\b/gi, "vente").replace(/\ba louer\b/gi, "location"),
    `${parent.query} prix surface`,
    `${parent.query} ${parent.intent === "sale" ? "achat" : "location"}`,
    `${parent.query} Maroc`,
  ];

  const unique = [...new Set(variants.map((q) => q.replace(/\s+/g, " ").trim()))]
    .filter((q) => q && q !== parent.query)
    .slice(0, maximum);

  return unique.map((query, index) => ({
    id: idFor(["adaptive", parent.id, query, String(index)]),
    phase: "adaptive" as const,
    source_id: parent.source_id,
    query,
    city: parent.city,
    property_type: parent.property_type,
    intent: parent.intent,
    parent_query_id: parent.id,
  }));
}

export function buildAdaptiveQueries(
  metric: HarvestQueryMetrics,
  alreadyPlannedQueries: ReadonlySet<string>,
): HarvestQuery[] {
  return adaptiveVariantQueries(metric).filter((query) => !alreadyPlannedQueries.has(query.query));
}

export function selectRefreshQueries(
  metrics: ReadonlyArray<HarvestQueryMetrics>,
  limit = REFRESH_QUERY_BUDGET,
): HarvestQuery[] {
  return [...metrics]
    .filter((metric) => metric.raw_results > 0)
    .sort((a, b) => {
      if (b.accepted_results !== a.accepted_results) return b.accepted_results - a.accepted_results;
      if (b.new_unique_results !== a.new_unique_results) return b.new_unique_results - a.new_unique_results;
      return b.yield_ratio - a.yield_ratio;
    })
    .slice(0, limit)
    .map((metric, index) => ({
      ...metric.query,
      id: idFor(["refresh", metric.query.id, String(index)]),
      phase: "refresh" as const,
      parent_query_id: metric.query.id,
    }));
}

export function buildInitialHarvestPlan(): { fixed: HarvestQuery[]; discovery: HarvestQuery[] } {
  const fixed = buildFixedHarvestQueries();
  const discovery = buildDiscoveryHarvestQueries();
  if (fixed.length + discovery.length !== FIXED_QUERY_BUDGET + DISCOVERY_QUERY_BUDGET) {
    throw new Error("initial harvest plan invariant failed");
  }
  return { fixed, discovery };
}
