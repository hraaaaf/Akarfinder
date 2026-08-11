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

export type GeographyScope = "MOROCCO_LIKELY" | "FOREIGN_LIKELY" | "UNKNOWN";
export type TransactionSignal = "SALE" | "RENT" | "BOTH" | "UNKNOWN";

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
  geographyScope: GeographyScope;
  detectedCities: string[];
  transactionSignal: TransactionSignal;
  realEstateScore: number;
  likelyRealEstate: boolean;
  reasons: string[];
}

export interface DomainCitySignal {
  city: string;
  urlRepresentations: number;
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
  likelyMoroccoUrls: number;
  foreignLikelyUrls: number;
  geographyUnknownUrls: number;
  likelyMoroccoRealEstateUrls: number;
  likelyMoroccoListingDetailUrls: number;
  moroccoShare: number;
  moroccoShareOfRealEstate: number;
  likelyMoroccoDetailShare: number;
  saleLikelyMoroccoUrls: number;
  rentLikelyMoroccoUrls: number;
  bothTransactionLikelyMoroccoUrls: number;
  unknownTransactionLikelyMoroccoUrls: number;
  detectedCities: DomainCitySignal[];
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
  "facebook.com", "instagram.com", "tiktok.com", "youtube.com", "reddit.com",
  "x.com", "twitter.com", "linkedin.com",
]);

const DISCOVERY_TRANSPORT_DOMAINS = new Set([
  "google.com", "bing.com", "duckduckgo.com", "search.yahoo.com", "support.google.com",
  "support.microsoft.com", "microsoft.com", "wikipedia.org", "en.wikipedia.org",
  "fr.wikipedia.org", "stackoverflow.com", "zhihu.com", "telecontact.ma", "tiendeo.ma",
]);

const AGGREGATOR_DOMAINS = new Set([
  "immo.mitula.ma", "immobilier.trovit.ma", "nuroa.ma", "logic-immo.com",
  "immobilier.cari.ma", "housing.place", "cozycozy.com",
]);

const DIRECT_PORTAL_DOMAINS = new Set([
  "marocannonces.com", "ma.afribaba.com", "dabaannonce.ma", "sakane.ma", "yakeey.com",
  "2p.ma", "domio.ma", "souqcity.ma", "1000-annonces.com", "portail-immobilier.ma",
  "flaha.ma", "darkom.ma", "annonces-express.com", "milkiya.ma", "annoncesmaroc.ma",
  "sekna.ma",
]);

const RE_STRONG = [
  "immobilier", "appartement", "villa", "terrain", "studio", "duplex", "riad",
  "maison", "bureau", "commerce", "local commercial", "magasin a vendre", "magasin a louer", "residence",
  "property", "apartment", "house", "land", "office", "real estate",
  "عقار", "شقة", "فيلا", "منزل", "أرض", "ارض", "مكتب", "محل",
];

const SALE_SIGNALS = ["vente", "vendre", "a vendre", "for sale", "selling", "بيع", "للبيع"];
const RENT_SIGNALS = ["location", "louer", "a louer", "for rent", "rental", "كراء", "إيجار", "للكراء"];
const RE_FACT = ["m²", "m2", "mad", " dh ", "dhs", "chambre", "chambres", "bedroom", "sqm"];

const NEGATIVE_CONTEXT = [
  "emploi", "job", "voiture", "auto", "moto", "restaurant", "recette", "football",
  "support", "documentation", "wikipedia", "hotel booking", "vol pas cher", "airbnb",
  "location vacances", "locations de vacances", "vacation rental", "holiday rental", "par nuit", "per night",
];

const MOROCCO_COUNTRY_SIGNALS = ["maroc", "morocco", "المغرب", "marocain", "marocaine"];
const MOROCCO_LOCATION_SIGNALS = [
  "gueliz", "souissi", "agdal", "hay riad", "hay ryad", "maarif", "ain diab",
  "oasis casablanca", "oasis casa",
];
const FOREIGN_COUNTRY_SIGNALS = [
  "algerie", "algeria", "الجزائر", "tunisie", "tunisia", "تونس", "france", "paris",
  "marseille", "lyon", "luxembourg", "belgique", "belgium", "espagne", "spain",
  "portugal", "dubai", "uae", "emirats", "emirates", "qatar", "turquie", "turkey",
];

const CITY_SIGNALS: Array<[string, string[]]> = [
  ["Casablanca", ["casablanca", "casa", "الدار البيضاء"]],
  ["Rabat", ["rabat", "الرباط"]],
  ["Marrakech", ["marrakech", "marrakesh", "مراكش"]],
  ["Tanger", ["tanger", "tangier", "طنجة"]],
  ["Agadir", ["agadir", "اكادير", "أكادير"]],
  ["Fès", ["fes", "fez", "فاس"]],
  ["Meknès", ["meknes", "مكناس"]],
  ["Kénitra", ["kenitra", "القنيطرة"]],
  ["Témara", ["temara", "تمارة"]],
  ["Salé", ["سلا", "sale maroc", "sale rabat"]],
  ["El Jadida", ["el jadida", "الجديدة"]],
  ["Mohammedia", ["mohammedia", "المحمدية"]],
  ["Bouskoura", ["bouskoura"]],
  ["Dar Bouazza", ["dar bouazza"]],
  ["Tétouan", ["tetouan", "تطوان"]],
  ["Oujda", ["oujda", "وجدة"]],
  ["Nador", ["nador", "الناظور"]],
  ["Ifrane", ["ifrane", "إفران"]],
  ["Essaouira", ["essaouira", "الصويرة"]],
  ["Dakhla", ["dakhla", "الداخلة"]],
  ["Laâyoune", ["laayoune", "laayoun", "العيون"]],
  ["Khouribga", ["khouribga", "خريبكة"]],
  ["Béni Mellal", ["beni mellal", "bni mellal", "بني ملال"]],
  ["Safi", ["safi", "آسفي"]],
  ["Settat", ["settat", "سطات"]],
  ["Tamesna", ["tamesna"]],
  ["Harhoura", ["harhoura"]],
  ["Skhirat", ["skhirat"]],
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
  "prohibited", "permission_required", "unverified", "expired",
]);

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^www\./, "");
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
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

function domainHasMoroccoPrior(domain: string): boolean {
  return domain.endsWith(".ma") || domain.startsWith("ma.") || domain.includes("maroc") || domain.includes("morocco");
}

export function classifyDomainRole(inputDomain: string): DomainRole {
  const domain = normalizeDomain(inputDomain);
  if (domainMatches(domain, SOCIAL_DOMAINS)) return "SOCIAL";
  if (domainMatches(domain, DISCOVERY_TRANSPORT_DOMAINS)) return "DISCOVERY_TRANSPORT";
  if (domainMatches(domain, AGGREGATOR_DOMAINS)) return "AGGREGATOR";
  if (domainMatches(domain, DIRECT_PORTAL_DOMAINS)) return "DIRECT_PORTAL";
  return "UNKNOWN";
}

function detectCities(text: string): string[] {
  return CITY_SIGNALS
    .filter(([, aliases]) => aliases.some((alias) => text.includes(normalizeText(alias))))
    .map(([city]) => city);
}

function detectTransaction(text: string): TransactionSignal {
  const sale = hasAny(text, SALE_SIGNALS);
  const rent = hasAny(text, RENT_SIGNALS);
  if (sale && rent) return "BOTH";
  if (sale) return "SALE";
  if (rent) return "RENT";
  return "UNKNOWN";
}

function detectGeography(sourceDomain: string, text: string, detectedCities: string[]): GeographyScope {
  const explicitMorocco = detectedCities.length > 0 || hasAny(text, MOROCCO_COUNTRY_SIGNALS) || hasAny(text, MOROCCO_LOCATION_SIGNALS);
  const explicitForeign = hasAny(text, FOREIGN_COUNTRY_SIGNALS);
  if (explicitMorocco) return "MOROCCO_LIKELY";
  if (explicitForeign) return "FOREIGN_LIKELY";
  if (domainHasMoroccoPrior(sourceDomain)) return "MOROCCO_LIKELY";
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
    candidate.url, candidate.title, candidate.snippet, candidate.discoveryQuery,
  ].filter(Boolean).join(" "));
  const url = urlFeatures(candidate.url);
  const reasons: string[] = [];
  const detectedCities = detectCities(combined);
  const transactionSignal = detectTransaction(combined);
  const geographyScope = detectGeography(sourceDomain, combined, detectedCities);

  let realEstateScore = 0;
  if (hasAny(combined, RE_STRONG)) {
    realEstateScore += 2;
    reasons.push("REAL_ESTATE_ENTITY_SIGNAL");
  }
  if (transactionSignal !== "UNKNOWN") {
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
  reasons.push(`GEO_${geographyScope}`);

  const likelyRealEstate = realEstateScore >= 2;
  if (!likelyRealEstate) {
    return {
      sourceDomain, domainRole, pageKind: "NON_REAL_ESTATE", geographyScope, detectedCities,
      transactionSignal, realEstateScore, likelyRealEstate, reasons,
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

  return {
    sourceDomain, domainRole, pageKind, geographyScope, detectedCities, transactionSignal,
    realEstateScore, likelyRealEstate, reasons,
  };
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
  summary: Pick<DomainReservoirSummary, "authorizationStatus" | "displayPolicy" | "displayGate" | "ingestionGate">,
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
      policyToken(summary.displayPolicy) === "canonical_link_only" &&
      summary.likelyMoroccoRealEstateUrls > 0
    ) {
      return "POLICY_COMPATIBLE_TAIL";
    }
    return "MEASURE_ONLY";
  }

  if (summary.domainRole === "SOCIAL" || summary.domainRole === "DISCOVERY_TRANSPORT") return "HOLD";

  if (
    summary.likelyMoroccoRealEstateUrls >= 20 &&
    summary.realEstateShare >= 0.5 &&
    summary.moroccoShareOfRealEstate >= 0.1
  ) {
    return "SOURCE_FACTORY";
  }

  return "HOLD";
}

function recommendedAction(queue: MassQueue): string {
  switch (queue) {
    case "POLICY_COMPATIBLE_TAIL":
      return "MASS-2 must verify the existing canonical-link policy snapshot before any bounded indexing decision; MASS-1 creates no public row.";
    case "SOURCE_FACTORY":
      return "Send domain to MASS-2 Source Factory for Morocco-scoped robots/terms/permission/channel review. No authorization is inferred by MASS-1.";
    case "MEASURE_ONLY":
      return "Measure reservoir only. Existing Source Registry policy remains authoritative and unchanged.";
    default:
      return "Hold until stronger Morocco-scoped real-estate evidence or a deliberate source review exists.";
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
  const likelyMoroccoUrls = classifications.filter((row) => row.geographyScope === "MOROCCO_LIKELY").length;
  const foreignLikelyUrls = classifications.filter((row) => row.geographyScope === "FOREIGN_LIKELY").length;
  const geographyUnknownUrls = classifications.filter((row) => row.geographyScope === "UNKNOWN").length;
  const moroccoRealEstate = classifications.filter((row) => row.likelyRealEstate && row.geographyScope === "MOROCCO_LIKELY");
  const likelyMoroccoRealEstateUrls = moroccoRealEstate.length;
  const likelyMoroccoListingDetailUrls = moroccoRealEstate.filter((row) => row.pageKind === "LIKELY_LISTING_DETAIL").length;
  const saleLikelyMoroccoUrls = moroccoRealEstate.filter((row) => row.transactionSignal === "SALE").length;
  const rentLikelyMoroccoUrls = moroccoRealEstate.filter((row) => row.transactionSignal === "RENT").length;
  const bothTransactionLikelyMoroccoUrls = moroccoRealEstate.filter((row) => row.transactionSignal === "BOTH").length;
  const unknownTransactionLikelyMoroccoUrls = moroccoRealEstate.filter((row) => row.transactionSignal === "UNKNOWN").length;

  const cityCounts = new Map<string, number>();
  for (const row of moroccoRealEstate) {
    for (const city of row.detectedCities) cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
  }
  const detectedCities = [...cityCounts.entries()]
    .map(([city, urlRepresentations]) => ({ city, urlRepresentations }))
    .sort((a, b) => b.urlRepresentations - a.urlRepresentations || a.city.localeCompare(b.city));

  const signatureCounts = new Map<string, number>();
  for (const candidate of candidates) {
    const signature = normalizedDuplicateSignature(candidate);
    if (!signature) continue;
    signatureCounts.set(signature, (signatureCounts.get(signature) ?? 0) + 1);
  }
  let duplicateSignalRows = 0;
  for (const count of signatureCounts.values()) if (count > 1) duplicateSignalRows += count - 1;

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
    likelyMoroccoUrls,
    foreignLikelyUrls,
    geographyUnknownUrls,
    likelyMoroccoRealEstateUrls,
    likelyMoroccoListingDetailUrls,
    moroccoShare: Number(boundedRatio(likelyMoroccoUrls, candidates.length).toFixed(4)),
    moroccoShareOfRealEstate: Number(boundedRatio(likelyMoroccoRealEstateUrls, Math.max(1, likelyRealEstateUrls)).toFixed(4)),
    likelyMoroccoDetailShare: Number(boundedRatio(likelyMoroccoListingDetailUrls, Math.max(1, likelyMoroccoRealEstateUrls)).toFixed(4)),
    saleLikelyMoroccoUrls,
    rentLikelyMoroccoUrls,
    bothTransactionLikelyMoroccoUrls,
    unknownTransactionLikelyMoroccoUrls,
    detectedCities,
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
  const volume = logVolumeScore(likelyMoroccoRealEstateUrls);
  const roleFactor = domainRole === "DIRECT_PORTAL" ? 1 : domainRole === "AGGREGATOR" ? 0.88 : domainRole === "UNKNOWN" ? 0.78 : 0;
  const policyFactor = massQueue === "POLICY_COMPATIBLE_TAIL" ? 1 : massQueue === "SOURCE_FACTORY" ? 0.9 : massQueue === "MEASURE_ONLY" ? 0.25 : 0;
  const massPotentialScore = 100 * (
    0.55 * volume +
    0.15 * base.moroccoShareOfRealEstate +
    0.10 * base.realEstateShare +
    0.15 * base.likelyMoroccoDetailShare +
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
    b.likelyMoroccoRealEstateUrls - a.likelyMoroccoRealEstateUrls ||
    b.likelyMoroccoListingDetailUrls - a.likelyMoroccoListingDetailUrls ||
    b.urlRepresentations - a.urlRepresentations ||
    a.sourceDomain.localeCompare(b.sourceDomain),
  );
}
