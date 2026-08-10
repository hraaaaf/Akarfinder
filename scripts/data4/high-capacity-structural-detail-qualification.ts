export const DATA_4_9B_SOURCES = [
  "valfoncier.ma",
  "christiesrealestatemorocco.com",
  "immo-maroc.com",
  "agadirimmobilier.ma",
  "proimmobilier.ma",
  "capital-properties.ma",
] as const;

export type Data49bSource = typeof DATA_4_9B_SOURCES[number];

export type StructuralRule = {
  sourceDomain: Data49bSource;
  critical: boolean;
  detailPatterns: readonly string[];
  namespaceRootPatterns: readonly string[];
  blockedPatterns: readonly string[];
};

export type StructuralClassification =
  | "DETAIL_PATTERN_MATCH"
  | "REJECT_NAMESPACE_ROOT"
  | "REJECT_TAXONOMY_OR_ARCHIVE"
  | "REJECT_NO_DETAIL_PATTERN"
  | "REJECT_IDENTITY_COLLISION";

export type ClassifiedIdentity = {
  sourceDomain: Data49bSource;
  identity: string;
  canonicalUrls: string[];
  pathname: string;
  classification: StructuralClassification;
  matchedPattern: string | null;
};

const RULES: Record<Data49bSource, StructuralRule> = {
  "valfoncier.ma": {
    sourceDomain: "valfoncier.ma",
    critical: true,
    detailPatterns: ["^/bien-immobilier/[^/]+/?$"],
    namespaceRootPatterns: ["^/bien-immobilier/?$"],
    blockedPatterns: [
      "^/(?:partenaires|ville-du-bien|agent|agents|agence|category|categorie|tag)(?:/|$)",
      "(?:^|/)page/\\d+/?$",
    ],
  },
  "christiesrealestatemorocco.com": {
    sourceDomain: "christiesrealestatemorocco.com",
    critical: true,
    detailPatterns: ["^/(?:fr|en)/annonces/ref-[a-z0-9-]+/[^/]+/?$"],
    namespaceRootPatterns: ["^/(?:fr|en)/annonces/?$"],
    blockedPatterns: [
      "^/(?:fr|en)/(?:ventes|sales|region[^/]*|regions|agence|agences|actualites|news|blog)(?:/|$)",
      "(?:^|/)page/\\d+/?$",
    ],
  },
  "immo-maroc.com": {
    sourceDomain: "immo-maroc.com",
    critical: true,
    detailPatterns: ["^/(?:vente|location|achat)-[^/]*-[a-z]{1,4}\\d{4,}/?$"],
    namespaceRootPatterns: [],
    blockedPatterns: [
      "^/(?:vente|location|location-annuelle|location-saisonniere|achat)/(?:all|appartement|villa|terrain|riad|commerce|bureau)(?:/|$)",
      "(?:^|/)(?:par-(?:date|date-desc|prix|prix-desc|surface|surface-desc|chambres)|page)/?(?:\\d+)?/?$",
      "\\.html?/?$",
    ],
  },
  "agadirimmobilier.ma": {
    sourceDomain: "agadirimmobilier.ma",
    critical: true,
    detailPatterns: ["^/immobilier/[^/]+/?$"],
    namespaceRootPatterns: ["^/immobilier/?$"],
    blockedPatterns: [
      "^/(?:biens|ville|statut|le-blog-immobilier-a-agadir-maroc|blog|category|categorie|tag|author)(?:/|$)",
      "(?:^|/)page/\\d+/?$",
    ],
  },
  "proimmobilier.ma": {
    sourceDomain: "proimmobilier.ma",
    critical: true,
    detailPatterns: ["^/(?:[a-z]{2}/)?property/[^/]+/?$"],
    namespaceRootPatterns: ["^/(?:[a-z]{2}/)?property/?$"],
    blockedPatterns: [
      "^/(?:[a-z]{2}/)?property-(?:type|city|feature|status|label)(?:/|$)",
      "^/(?:[a-z]{2}/)?agent(?:/|$)",
      "(?:^|/)page/\\d+/?$",
    ],
  },
  "capital-properties.ma": {
    sourceDomain: "capital-properties.ma",
    critical: false,
    detailPatterns: ["^/(?:en/)?offres/[^/]+/[^/]+/[^/]+/[^/]+/[^/]+/?$"],
    namespaceRootPatterns: ["^/(?:en/)?offres/?$"],
    blockedPatterns: [
      "^/(?:en/)?(?:quartier|type-de-bien|type-de-transaction|agent|blog|category|categorie|tag)(?:/|$)",
      "^/(?:en/)?offres/[^/]+/[^/]+/?$",
      "(?:^|/)page/\\d+/?$",
    ],
  },
};

function re(pattern: string): RegExp {
  return new RegExp(pattern, "i");
}

export function getStructuralRule(sourceDomain: Data49bSource): StructuralRule {
  return RULES[sourceDomain];
}

export function isCritical49bSource(sourceDomain: Data49bSource): boolean {
  return RULES[sourceDomain].critical;
}

export function classifyStructuralIdentity(
  sourceDomain: Data49bSource,
  identity: string,
  canonicalUrls: string[],
): ClassifiedIdentity {
  const urls = [...canonicalUrls].sort();
  let pathname = "/";
  try {
    pathname = new URL(urls[0] ?? identity).pathname;
  } catch {
    return {
      sourceDomain,
      identity,
      canonicalUrls: urls,
      pathname,
      classification: "REJECT_NO_DETAIL_PATTERN",
      matchedPattern: null,
    };
  }

  if (urls.length !== 1) {
    return {
      sourceDomain,
      identity,
      canonicalUrls: urls,
      pathname,
      classification: "REJECT_IDENTITY_COLLISION",
      matchedPattern: null,
    };
  }

  const rule = RULES[sourceDomain];
  const blocked = rule.blockedPatterns.find((pattern) => re(pattern).test(pathname));
  if (blocked) {
    return {
      sourceDomain,
      identity,
      canonicalUrls: urls,
      pathname,
      classification: "REJECT_TAXONOMY_OR_ARCHIVE",
      matchedPattern: blocked,
    };
  }

  const namespaceRoot = rule.namespaceRootPatterns.find((pattern) => re(pattern).test(pathname));
  if (namespaceRoot) {
    return {
      sourceDomain,
      identity,
      canonicalUrls: urls,
      pathname,
      classification: "REJECT_NAMESPACE_ROOT",
      matchedPattern: namespaceRoot,
    };
  }

  const detail = rule.detailPatterns.find((pattern) => re(pattern).test(pathname));
  if (detail) {
    return {
      sourceDomain,
      identity,
      canonicalUrls: urls,
      pathname,
      classification: "DETAIL_PATTERN_MATCH",
      matchedPattern: detail,
    };
  }

  return {
    sourceDomain,
    identity,
    canonicalUrls: urls,
    pathname,
    classification: "REJECT_NO_DETAIL_PATTERN",
    matchedPattern: null,
  };
}
