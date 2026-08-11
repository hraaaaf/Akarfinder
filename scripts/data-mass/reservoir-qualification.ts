export type DomainRole =
  | "DIRECT_PORTAL"
  | "AGGREGATOR"
  | "SOCIAL"
  | "DISCOVERY_TRANSPORT"
  | "UNKNOWN";

export type PageKind =
  | "LIKELY_LISTING_DETAIL"
  | "LIKELY_CATEGORY_OR_SEARCH"
  | "AMBIGUOUS"
  | "NON_REAL_ESTATE";

export type MassQueue =
  | "POLICY_COMPATIBLE_TAIL"
  | "SOURCE_FACTORY"
  | "MEASURE_ONLY"
  | "HOLD";

export interface ReservoirCandidate {
  sourceDomain: string;
  url: string;
  title?: string | null;
  snippet?: string | null;
  discoveryQuery?: string | null;
  contentFingerprint?: string | null;
}

export interface RegistryPolicySnapshot {
  sourceDomain: string;
  authorizationStatus: string | null;
  displayPolicy: string | null;
  displayGate: string | null;
  acquisitionMode: string | null;
  ingestionGate: string | null;
}

export interface CandidateClassification {
  sourceDomain: string;
  domainRole: DomainRole;
  pageKind: PageKind;
  realEstateScore: number;
  likelyRealEstate: boolean;
  reasons: string[];
}

export interface DomainReservoirSummary {
  sourceDomain: string;
  domainRole: DomainRole;
  urlRepresentations: number;
  likelyRealEstateUrls: number;
  likelyListingDetailUrls: number;
  likelyCategoryOrSearchUrls: number;
  ambiguousUrls: number;
  nonRealEstateUrls: number;
  realEstateShare: number;
  likelyDetailShare: number;
  duplicateSignalRows: number;
  duplicateSignalRatio: number;
  registryStatus: "REGISTERED" | "UNREGISTERED";
  authorizationStatus: string | null;
  displayPolicy: string | null;
  displayGate: string | null;
  acquisitionMode: string | null;
  ingestionGate: string | null;
  massQueue: MassQueue;
  massPotentialScore: number;
  publicActivableNow: false;
  recommendedNextAction: string;
}

const SOCIAL_DOMAINS = new Set([
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "youtube.com",
  "reddit.com",
  "x.com",
  "twitter.com",
  "linkedin.com",
]);

const DISCOVERY_TRANSPORT_DOMAINS = new Set([
  "google.com",
  "bing.com",
  "duckduckgo.com",
  "search.yahoo.com",
  "support.google.com",
  "support.microsoft.com",
  "microsoft.com",
  "wikipedia.org",
  "en.wikipedia.org",
  "fr.wikipedia.org",
  "stackoverflow.com",
  "zhihu.com",
]);

const AGGREGATOR_DOMAINS = new Set([
  "immo.mitula.ma",
  "immobilier.trovit.ma",
  "nuroa.ma",
  "logic-immo.com",
  "immobilier.cari.ma",
  "housing.place",
  "cozycozy.com",
]);

const DIRECT_PORTAL_DOMAINS = new Set([
  "marocannonces.com",
  "ma.afribaba.com",
  "dabaannonce.ma",
  "sakane.ma",
  "yakeey.com",
  "2p.ma",
  "domio.ma",
  "souqcity.ma",
  "1000-annonces.com",
  "lkeria.com",
  "portail-immobilier.ma",
  "flaha.ma",
  "darkom.ma",
  "annonces-express.com",
  "milkiya.ma",
  "annoncesmaroc.ma",
  "sekna.ma",
]);

const RE_STRONG = [
  "immobilier", "appartement", "villa", "terrain", "studio", "duplex", "riad",
  "maison", "bureau", "commerce", "magasin", "local commercial", "résidence",
  "residence", "property", "apartment", "house", "land", "office", "real estate",
  "عقار", "شقة", "فيلا", "منزل", "أرض", "ارض", "مكتب", "محل",
];

const RE_TRANSACTION = [
  "vente", "vendre", "à vendre", "a vendre", "location", "louer", "à louer", "a louer",
  "sale", "for sale", "rent", "for rent", "بيع", "للبيع", "كراء", "إيجار", "للكراء",
];

const RE_FACT = ["m²", "m2", "mad", "dh", "dhs", "chambre", "chambres", "bedroom", "sqm"];

const NEGATIVE_CONTEXT = [
  "emploi", "job", "voiture", "auto", "moto", "restaurant", "recette", "football",
  "support", "documentation", "wikipedia", "hotel booking", "vol pas cher",
];

const CATEGORY_MARKERS = [
  "/search", "/recherche", "/rechercher", "/category", "/categorie", "/liste",
  "/annonces?", "/properties?", "page=", "sort=", "filter=", "filters=",
];

const DETAIL_MARKERS = [
  "/annonce/", "/annonces/", "/bien/", "/bien-immobilier/", "/property/", "/properties/",
  "/listing/", "/vente/", "/location/", "/acheter/", "/louer/",
];

const RESTRICTED_AUTHORIZATION_STATUSES = new Set([
  "prohibited",
  "permission_required",
  "unverified",
  "expired",
]);

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^www\./, "");
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function policyToken(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function boundedRatio(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.max(0, Math.min(1, numerator / denominator));
}

function logVolumeScore(rows: number): number {
  if (rows <= 0) return 0;
  return Math.max(0, Math.min(1, Math.log10(rows + 1) / 4));
}

function hasAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function domainMatches(domain: string, candidates: Set<string>): boolean {
  if (candidates.has(domain)) return true;
  return [...candidates].some((candidate) => domain.endsWith(`.${candidate}`));
}

export function classifyDomainRole(inputDomain: string): DomainRole {
  const domain = normalizeDomain(inputDomain);
  if (domainMatches(domain, SOCIAL_DOMAINS)) return "SOCIAL";
  if (domainMatches(domain, DISCOVERY_TRANSPORT_DOMAINS)) return "DISCOVERY_TRANSPORT";
  if (domainMatches(domain, AGGREGATOR_DOMAINS)) return "AGGREGATOR";
  if (domainMatches(domain, DIRECT_PORTAL_DOMAINS)) return "DIRECT_PORTAL";
  return "UNKNOWN";
}

function urlFeatures(rawUrl: string): { path: string; pathDepth: number; hasIdLikeToken: boolean } {
  try {
    const parsed = new URL(rawUrl);
    const path = `${parsed.pathname}${parsed.search}`.toLowerCase();
    const segments = parsed.pathname.split("/").filter(Boolean);
    const hasIdLikeToken = segments.some((segment) =>
      /^\d{4,}$/.test(segment) ||
      /(?:^|[-_])\d{5,}(?:$|[-_])/.test(segment) ||
      /^[a-z0-9-]{8,}-\d{3,}$/i.test(segment),
    );
    return { path, pathDepth: segments.length, hasIdLikeToken };
  } catch {
    return { path: rawUrl.toLowerCase(), pathDepth: 0, hasIdLikeToken: false };
  }
}

export function classifyReservoirCandidate(candidate: ReservoirCandidate): CandidateClassification {
  const sourceDomain = normalizeDomain(candidate.sourceDomain);
  const domainRole = classifyDomainRole(sourceDomain);
  const combined = normalizeText([
    candidate.url,
    candidate.title,
    candidate.snippet,
    candidate.discoveryQuery,
  ].filter(Boolean).join(" "));
  const url = urlFeatures(candidate.url);
  const reasons: string[] = [];

  let realEstateScore = 0;
  if (hasAny(combined, RE_STRONG)) {
    realEstateScore += 2;
    reasons.push("REAL_ESTATE_ENTITY_SIGNAL");
  }
  if (hasAny(combined, RE_TRANSACTION)) {
    realEstateScore += 1;
    reasons.push("TRANSACTION_SIGNAL");
  }
  if (hasAny(combined, RE_FACT)) {
    realEstateScore += 1;
    reasons.push("PROPERTY_FACT_SIGNAL");
  }
  if (hasAny(combined, NEGATIVE_CONTEXT)) {
    realEstateScore -= 2;
    reasons.push("NEGATIVE_CONTEXT_SIGNAL");
  }
  if (domainRole === "DIRECT_PORTAL" || domainRole === "AGGREGATOR") {
    realEstateScore += 1;
    reasons.push("KNOWN_REAL_ESTATE_DOMAIN_ROLE");
  }

  const likelyRealEstate = realEstateScore >= 2;
  if (!likelyRealEstate) {
    return {
      sourceDomain,
      domainRole,
      pageKind: "NON_REAL_ESTATE",
      realEstateScore,
      likelyRealEstate,
      reasons,
    };
  }

  const categoryMarker = hasAny(url.path, CATEGORY_MARKERS);
  const detailMarker = hasAny(url.path, DETAIL_MARKERS);
  const detailStructure = url.hasIdLikeToken || (detailMarker && url.pathDepth >= 3) || url.pathDepth >= 4;

  let pageKind: PageKind = "AMBIGUOUS";
  if (categoryMarker && !url.hasIdLikeToken) {
    pageKind = "LIKELY_CATEGORY_OR_SEARCH";
    reasons.push("CATEGORY_OR_SEARCH_URL_PATTERN");
  } else if (detailStructure && (detailMarker || realEstateScore >= 3)) {
    pageKind = "LIKELY_LISTING_DETAIL";
    reasons.push("DETAIL_URL_STRUCTURE");
  } else if (url.pathDepth <= 1) {
    pageKind = "LIKELY_CATEGORY_OR_SEARCH";
    reasons.push("SHALLOW_URL_STRUCTURE");
  }

  return { sourceDomain, domainRole, pageKind, realEstateScore, likelyRealEstate, reasons };
}

function normalizedDuplicateSignature(candidate: ReservoirCandidate): string | null {
  const fingerprint = candidate.contentFingerprint?.trim();
  if (fingerprint) return `fp:${fingerprint}`;
  const title = normalizeText(candidate.title);
  const snippet = normalizeText(candidate.snippet);
  if (!title && !snippet) return null;
  return `text:${title.slice(0, 180)}|${snippet.slice(0, 260)}`;
}

function policyForcesMeasureOnly(
  summary: Pick<
    DomainReservoirSummary,
    "authorizationStatus" | "displayPolicy" | "displayGate" | "ingestionGate"
  >,
): boolean {
  const authorizationStatus = policyToken(summary.authorizationStatus);
  const displayPolicy = policyToken(summary.displayPolicy);
  const displayGate = policyToken(summary.displayGate);
  const ingestionGate = policyToken(summary.ingestionGate);

  if (!authorizationStatus) return true;
  if (RESTRICTED_AUTHORIZATION_STATUSES.has(authorizationStatus)) return true;
  if (displayGate === "hidden") return true;
  if (displayPolicy === "internal_signal_only") return true;
  if (ingestionGate === "internal_signal_only") return true;
  return false;
}

function chooseQueue(
  summary: Omit<DomainReservoirSummary, "massQueue" | "massPotentialScore" | "publicActivableNow" | "recommendedNextAction">,
): MassQueue {
  if (summary.registryStatus === "REGISTERED") {
    if (policyForcesMeasureOnly(summary)) return "MEASURE_ONLY";

    if (
      policyToken(summary.displayGate) === "external_tail_link_only" &&
      policyToken(summary.displayPolicy) === "canonical_link_only"
    ) {
      return "POLICY_COMPATIBLE_TAIL";
    }

    return "MEASURE_ONLY";
  }

  if (summary.domainRole === "SOCIAL" || summary.domainRole === "DISCOVERY_TRANSPORT") return "HOLD";

  if (summary.urlRepresentations >= 25 && summary.realEstateShare >= 0.5 && summary.likelyRealEstateUrls >= 20) {
    return "SOURCE_FACTORY";
  }

  return "HOLD";
}

function recommendedAction(queue: MassQueue): string {
  switch (queue) {
    case "POLICY_COMPATIBLE_TAIL":
      return "MASS-2 must verify the existing canonical-link policy snapshot before any bounded indexing decision; MASS-1 creates no public row.";
    case "SOURCE_FACTORY":
      return "Send domain to MASS-2 Source Factory for robots/terms/permission/channel review. No authorization is inferred by MASS-1.";
    case "MEASURE_ONLY":
      return "Measure reservoir only. Existing Source Registry policy remains authoritative and unchanged.";
    default:
      return "Hold outside the Source Factory priority queue until stronger real-estate/detail evidence or a deliberate source review exists.";
  }
}

export function summarizeDomainReservoir(
  sourceDomain: string,
  candidates: ReservoirCandidate[],
  policy: RegistryPolicySnapshot | null,
): DomainReservoirSummary {
  const classifications = candidates.map(classifyReservoirCandidate);
  const domainRole = classifications[0]?.domainRole ?? classifyDomainRole(sourceDomain);
  const likelyRealEstateUrls = classifications.filter((row) => row.likelyRealEstate).length;
  const likelyListingDetailUrls = classifications.filter((row) => row.pageKind === "LIKELY_LISTING_DETAIL").length;
  const likelyCategoryOrSearchUrls = classifications.filter((row) => row.pageKind === "LIKELY_CATEGORY_OR_SEARCH").length;
  const ambiguousUrls = classifications.filter((row) => row.pageKind === "AMBIGUOUS").length;
  const nonRealEstateUrls = classifications.filter((row) => row.pageKind === "NON_REAL_ESTATE").length;

  const signatureCounts = new Map<string, number>();
  for (const candidate of candidates) {
    const signature = normalizedDuplicateSignature(candidate);
    if (!signature) continue;
    signatureCounts.set(signature, (signatureCounts.get(signature) ?? 0) + 1);
  }
  let duplicateSignalRows = 0;
  for (const count of signatureCounts.values()) {
    if (count > 1) duplicateSignalRows += count - 1;
  }

  const base = {
    sourceDomain: normalizeDomain(sourceDomain),
    domainRole,
    urlRepresentations: candidates.length,
    likelyRealEstateUrls,
    likelyListingDetailUrls,
    likelyCategoryOrSearchUrls,
    ambiguousUrls,
    nonRealEstateUrls,
    realEstateShare: Number(boundedRatio(likelyRealEstateUrls, candidates.length).toFixed(4)),
    likelyDetailShare: Number(boundedRatio(likelyListingDetailUrls, Math.max(1, likelyRealEstateUrls)).toFixed(4)),
    duplicateSignalRows,
    duplicateSignalRatio: Number(boundedRatio(duplicateSignalRows, candidates.length).toFixed(4)),
    registryStatus: policy ? "REGISTERED" as const : "UNREGISTERED" as const,
    authorizationStatus: policy?.authorizationStatus ?? null,
    displayPolicy: policy?.displayPolicy ?? null,
    displayGate: policy?.displayGate ?? null,
    acquisitionMode: policy?.acquisitionMode ?? null,
    ingestionGate: policy?.ingestionGate ?? null,
  };

  const massQueue = chooseQueue(base);
  const volume = logVolumeScore(candidates.length);
  const roleFactor = domainRole === "DIRECT_PORTAL" ? 1 : domainRole === "AGGREGATOR" ? 0.85 : domainRole === "UNKNOWN" ? 0.7 : 0;
  const policyFactor = massQueue === "POLICY_COMPATIBLE_TAIL" ? 1 : massQueue === "SOURCE_FACTORY" ? 0.9 : massQueue === "MEASURE_ONLY" ? 0.25 : 0;
  const massPotentialScore = 100 * (
    0.45 * volume +
    0.30 * base.realEstateShare +
    0.20 * base.likelyDetailShare +
    0.05 * (1 - base.duplicateSignalRatio)
  ) * roleFactor * policyFactor;

  return {
    ...base,
    massQueue,
    massPotentialScore: Number(massPotentialScore.toFixed(2)),
    publicActivableNow: false,
    recommendedNextAction: recommendedAction(massQueue),
  };
}

export function rankDomainReservoirs(rows: DomainReservoirSummary[]): DomainReservoirSummary[] {
  return [...rows].sort((a, b) =>
    b.massPotentialScore - a.massPotentialScore ||
    b.likelyListingDetailUrls - a.likelyListingDetailUrls ||
    b.urlRepresentations - a.urlRepresentations ||
    a.sourceDomain.localeCompare(b.sourceDomain),
  );
}
