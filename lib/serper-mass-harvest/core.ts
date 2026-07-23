import registryJson from "@/data/openserp/source-domain-registry.json";
import type { HarvestObservation, HarvestQuery, HarvestRawResult } from "./types";

type RegistryPattern = string | { pattern: string; case_insensitive?: boolean };
type RegistryEntry = {
  domain: string;
  status: "approved_discovery" | "blocked" | "unclassified" | string;
  listing_url_patterns?: RegistryPattern[];
  blocked_url_patterns?: RegistryPattern[];
};

type RegistryShape = { domains?: RegistryEntry[] };

const REGISTRY = registryJson as unknown as RegistryShape;

const REAL_ESTATE_TERMS = [
  "immobilier",
  "appartement",
  "apartment",
  "villa",
  "maison",
  "house",
  "terrain",
  "land",
  "riad",
  "bureau",
  "office",
  "local commercial",
  "commerce",
  "ferme",
  "studio",
  "duplex",
  "vente",
  "vendre",
  "sale",
  "location",
  "louer",
  "rent",
  "كراء",
  "بيع",
  "شقة",
  "فيلا",
  "عقار",
];

const OBVIOUS_NON_REAL_ESTATE = [
  "voiture",
  "automobile",
  "smartphone",
  "telephone",
  "ordinateur",
  "laptop",
  "gaming",
  "meuble",
  "moto",
  "emploi",
  "recrutement",
];

const CATEGORY_HINTS = [
  "/category/",
  "/categories/",
  "/categorie/",
  "/recherche",
  "/search",
  "/city/",
  "/type/",
  "/property-type/",
  "/immobilier-a-vendre",
  "/immobilier-a-louer",
  "/appartements-a-vendre",
  "/appartements-a-louer",
];

const AVITO_REAL_ESTATE_SEGMENTS = [
  "appartements",
  "villas_et_riads",
  "terrains_et_fermes",
  "maisons",
  "bureaux",
  "local",
  "autre_immobilier",
];

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function compilePattern(input: RegistryPattern): RegExp | null {
  try {
    if (typeof input === "string") return new RegExp(input);
    return new RegExp(input.pattern, input.case_insensitive ? "i" : undefined);
  } catch {
    return null;
  }
}

function getRegistryEntry(domain: string): RegistryEntry | null {
  const normalized = domain.toLowerCase().replace(/^www\./, "");
  return (
    REGISTRY.domains?.find((entry) => entry.domain.toLowerCase().replace(/^www\./, "") === normalized) ?? null
  );
}

export function canonicalizeHarvestUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (!/^https?:$/.test(url.protocol)) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      const lower = key.toLowerCase();
      if (
        lower.startsWith("utm_") ||
        ["gclid", "fbclid", "msclkid", "srsltid", "ref", "referrer"].includes(lower)
      ) {
        url.searchParams.delete(key);
      }
    }
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.pathname = url.pathname.replace(/\/{2,}/g, "/");
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    url.searchParams.sort();
    return url.toString();
  } catch {
    return null;
  }
}

function matchesAny(pathname: string, patterns: RegistryPattern[] | undefined): boolean {
  if (!patterns || patterns.length === 0) return false;
  return patterns.some((pattern) => compilePattern(pattern)?.test(pathname) ?? false);
}

function looksLikeGenericIndividualUrl(pathname: string): boolean {
  return (
    /(?:^|\/)\d{4,}(?:\/|$|\.|-)/.test(pathname) ||
    /[_-][a-f0-9]{6,}(?:\.|$|\/)/i.test(pathname) ||
    /\/(?:property|properties|bien|biens|annonce|annonces|ad)\//i.test(pathname)
  );
}

export function classifyHarvestResult(input: {
  query: HarvestQuery;
  canonicalUrl: string;
  title?: string;
  snippet?: string;
}): { status: HarvestObservation["discovery_status"]; reasons: string[]; categoryOrNoise: boolean } {
  const url = new URL(input.canonicalUrl);
  const domain = url.hostname.replace(/^www\./, "");
  const pathname = decodeURIComponent(url.pathname);
  const text = normalizeText([input.query.query, input.title ?? "", input.snippet ?? "", pathname].join(" "));
  const reasons: string[] = [];
  const entry = getRegistryEntry(domain);

  if (entry?.status === "blocked") {
    return { status: "rejected", reasons: ["registry_blocked"], categoryOrNoise: true };
  }

  const hasRealEstate = REAL_ESTATE_TERMS.some((term) => text.includes(normalizeText(term)));
  const obviousNoise = OBVIOUS_NON_REAL_ESTATE.some((term) => text.includes(term));
  if (!hasRealEstate || obviousNoise) {
    return {
      status: "rejected",
      reasons: [!hasRealEstate ? "no_real_estate_signal" : "obvious_non_real_estate"],
      categoryOrNoise: true,
    };
  }
  reasons.push("real_estate_signal");

  if (matchesAny(pathname, entry?.blocked_url_patterns)) {
    return { status: "rejected", reasons: [...reasons, "blocked_url_pattern"], categoryOrNoise: true };
  }

  if (domain === "avito.ma") {
    const avitoRealEstate = AVITO_REAL_ESTATE_SEGMENTS.some((segment) => pathname.toLowerCase().includes(segment));
    if (!avitoRealEstate) {
      return { status: "rejected", reasons: [...reasons, "avito_non_real_estate_category"], categoryOrNoise: true };
    }
    reasons.push("avito_real_estate_category");
  }

  const registryDetail = entry?.status === "approved_discovery" && matchesAny(pathname, entry.listing_url_patterns);
  if (registryDetail) {
    return { status: "accepted", reasons: [...reasons, "registry_individual_listing_pattern"], categoryOrNoise: false };
  }

  const categoryLike = CATEGORY_HINTS.some((hint) => pathname.toLowerCase().includes(hint));
  if (categoryLike && !looksLikeGenericIndividualUrl(pathname)) {
    return { status: "rejected", reasons: [...reasons, "category_or_search_page"], categoryOrNoise: true };
  }

  if (looksLikeGenericIndividualUrl(pathname)) {
    return {
      status: "unclassified",
      reasons: [...reasons, "individual_like_url_unreviewed_source"],
      categoryOrNoise: false,
    };
  }

  return {
    status: "unclassified",
    reasons: [...reasons, "insufficient_individual_listing_evidence"],
    categoryOrNoise: true,
  };
}

export function normalizeHarvestResults(query: HarvestQuery, rawResults: HarvestRawResult[]): HarvestObservation[] {
  const seen = new Set<string>();
  const output: HarvestObservation[] = [];

  rawResults.forEach((raw, index) => {
    if (!raw.link) return;
    const canonical = canonicalizeHarvestUrl(raw.link);
    if (!canonical || seen.has(canonical)) return;
    seen.add(canonical);

    const url = new URL(canonical);
    const classified = classifyHarvestResult({
      query,
      canonicalUrl: canonical,
      title: raw.title,
      snippet: raw.snippet,
    });

    output.push({
      query,
      result_rank: raw.position ?? index + 1,
      source_domain: url.hostname.replace(/^www\./, ""),
      source_url: raw.link,
      canonical_url: canonical,
      title: raw.title?.trim() || null,
      snippet: raw.snippet?.trim() || null,
      discovery_status: classified.status,
      eligibility_reasons: classified.reasons,
    });
  });

  return output;
}
