import { load } from "cheerio";

export type MubawabCatalogSurfaceKind =
  | "national_category"
  | "national_aggregate"
  | "city_category"
  | "vacational"
  | "new_projects";

export type MubawabCatalogSurface = {
  id: string;
  kind: MubawabCatalogSurfaceKind;
  url: string;
  semantic_family: string;
  city?: string;
  transaction?: "sale" | "rent" | "vacational";
  property_type?: string;
  overlap_group?: string;
};

export type MubawabCatalogObservation = MubawabCatalogSurface & {
  visible_count: number | null;
  title: string | null;
  fetched_at: string;
};

export const MUBAWAB_CATALOG_SURFACES: MubawabCatalogSurface[] = [
  {
    id: "national-apartment-sale",
    kind: "national_category",
    url: "https://www.mubawab.ma/fr/sc/appartements-a-vendre",
    semantic_family: "apartments",
    transaction: "sale",
    property_type: "apartment",
  },
  {
    id: "national-apartment-rent",
    kind: "national_category",
    url: "https://www.mubawab.ma/fr/sc/appartements-a-louer",
    semantic_family: "apartments",
    transaction: "rent",
    property_type: "apartment",
  },
  {
    id: "national-office-sale",
    kind: "national_category",
    url: "https://www.mubawab.ma/fr/sc/bureaux-et-commerces-a-vendre",
    semantic_family: "offices",
    transaction: "sale",
    property_type: "office",
    overlap_group: "commercial-office",
  },
  {
    id: "national-office-rent",
    kind: "national_category",
    url: "https://www.mubawab.ma/fr/sc/bureaux-et-commerces-a-louer",
    semantic_family: "offices",
    transaction: "rent",
    property_type: "office",
    overlap_group: "commercial-office",
  },
  {
    id: "national-commercial-rent",
    kind: "national_category",
    url: "https://www.mubawab.ma/fr/sc/locaux-a-louer",
    semantic_family: "commercial",
    transaction: "rent",
    property_type: "commercial",
    overlap_group: "commercial-office",
  },
  {
    id: "national-all-rent",
    kind: "national_aggregate",
    url: "https://www.mubawab.ma/fr/cc/immobilier-a-louer",
    semantic_family: "all-rent",
    transaction: "rent",
    overlap_group: "all-rent",
  },
  {
    id: "national-commercial-sale-aggregate",
    kind: "national_aggregate",
    url: "https://www.mubawab.ma/fr/cc/bureaux-et-commerces-a-vendre",
    semantic_family: "commercial-office-aggregate",
    transaction: "sale",
    overlap_group: "commercial-office",
  },
  {
    id: "rabat-vacational-apartment",
    kind: "vacational",
    url: "https://www.mubawab.ma/fr/st/rabat/appartements-vacational",
    semantic_family: "vacational-apartments",
    city: "Rabat",
    transaction: "vacational",
    property_type: "apartment",
  },
  {
    id: "casablanca-vacational-apartment",
    kind: "vacational",
    url: "https://www.mubawab.ma/fr/st/casablanca/appartements-vacational",
    semantic_family: "vacational-apartments",
    city: "Casablanca",
    transaction: "vacational",
    property_type: "apartment",
  },
  {
    id: "new-projects",
    kind: "new_projects",
    url: "https://www.mubawab.ma/fr/pl/cité-ennasr/listing-promotion",
    semantic_family: "new-projects",
  },
];

function normalizeDigits(value: string): string {
  return value.replace(/[\s\u00a0\u202f.,]/g, "");
}

export function extractVisibleCatalogCount(html: string): number | null {
  const text = load(html).root().text().replace(/\s+/g, " ");
  const candidates = [
    /\(([0-9][0-9\s\u00a0\u202f.,]*)\s+r[ée]sultats?\)/i,
    /([0-9][0-9\s\u00a0\u202f.,]*)\s+r[ée]sultats?/i,
  ];

  for (const pattern of candidates) {
    const match = text.match(pattern);
    if (!match) continue;
    const normalized = normalizeDigits(match[1]);
    const parsed = Number.parseInt(normalized, 10);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

export function extractCatalogTitle(html: string): string | null {
  const $ = load(html);
  const title = $("h1").first().text().replace(/\s+/g, " ").trim();
  return title || null;
}

export async function inventoryMubawabCatalog(
  fetchPage: (url: string) => Promise<string>,
  options: { now?: () => string; surfaces?: MubawabCatalogSurface[] } = {},
): Promise<MubawabCatalogObservation[]> {
  const surfaces = options.surfaces ?? MUBAWAB_CATALOG_SURFACES;
  const now = options.now ?? (() => new Date().toISOString());
  const observations: MubawabCatalogObservation[] = [];

  for (const surface of surfaces) {
    const html = await fetchPage(surface.url);
    observations.push({
      ...surface,
      visible_count: extractVisibleCatalogCount(html),
      title: extractCatalogTitle(html),
      fetched_at: now(),
    });
  }

  return observations;
}

export function naiveCountMustNotBeUsed(observations: MubawabCatalogObservation[]): {
  visible_count_sum: number;
  overlap_groups: Record<string, string[]>;
} {
  const overlapGroups: Record<string, string[]> = {};
  for (const observation of observations) {
    if (!observation.overlap_group) continue;
    (overlapGroups[observation.overlap_group] ??= []).push(observation.id);
  }

  return {
    visible_count_sum: observations.reduce((sum, item) => sum + (item.visible_count ?? 0), 0),
    overlap_groups: overlapGroups,
  };
}
