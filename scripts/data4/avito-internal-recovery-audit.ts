export const AVITO_DOMAIN = "avito.ma" as const;

export type RecoveryClass =
  | "RECOVERABLE_FROM_EXISTING_DATA"
  | "INSUFFICIENT_EXISTING_EVIDENCE"
  | "NOISE_OR_NON_LISTING";

export interface AvitoUnavailableRow {
  canonical_url: string;
  seed_provider: string | null;
  property_type: string | null;
  intent: string | null;
  city: string | null;
  title: string | null;
  snippet: string | null;
  price_mad: number | string | null;
  surface_m2: number | string | null;
  normalization_status: string;
}

export interface VerticalRule {
  category_slug: string;
  vertical_classification: string;
}

export interface GeoAlias {
  normalized_alias: string;
}

export interface AvitoRegistrySnapshot {
  source_domain: string;
  authorization_status: string;
  acquisition_mode: string;
  detail_fetch_policy: string;
  content_reuse_policy: string;
  display_policy: string;
  display_gate: string;
  machine_gate: string;
  ingestion_gate: string;
}

export interface RecoveryRowAudit {
  canonicalUrl: string;
  categorySlug: string | null;
  locationSlug: string | null;
  seedProvider: string | null;
  verticalRealEstate: boolean;
  geoAliasMatch: boolean;
  hasPropertyType: boolean;
  propertyTypeCompatible: boolean;
  hasIntent: boolean;
  hasStoredCity: boolean;
  hasStoredTitle: boolean;
  hasStoredSnippet: boolean;
  hasPrice: boolean;
  hasSurface: boolean;
  recoveryClass: RecoveryClass;
  policyBlockedForNewObservation: boolean;
  publicActivable: false;
}

export interface AvitoRecoveryReport {
  schemaVersion: "data-4-1a-avito-internal-recovery-audit-v1";
  generatedAt: string;
  sourceDomain: typeof AVITO_DOMAIN;
  readOnly: true;
  sourceNetworkRequests: 0;
  databaseWrites: 0;
  policyChanges: 0;
  registry: AvitoRegistrySnapshot;
  summary: {
    unavailableRows: number;
    canonicalRealEstateRows: number;
    noiseOrNonListingRows: number;
    recoverableCoreRows: number;
    insufficientExistingEvidenceRows: number;
    withPropertyType: number;
    withCompatiblePropertyType: number;
    withIntent: number;
    withGeoAliasMatch: number;
    withTypeAndIntent: number;
    withTypeIntentAndGeo: number;
    withStoredTitle: number;
    withStoredSnippet: number;
    withPrice: number;
    withSurface: number;
    policyActivableRows: 0;
    realEstateShare: number;
    noiseShare: number;
  };
  categories: Array<{
    categorySlug: string;
    rows: number;
    recoverableCoreRows: number;
    insufficientRows: number;
  }>;
  rows: RecoveryRowAudit[];
}

const CATEGORY_PROPERTY_TYPE_COMPATIBILITY: Readonly<Record<string, readonly string[]>> = {
  appartements: ["apartment"],
  bureaux: ["office"],
  local: ["commercial"],
  terrains_et_fermes: ["land", "farm"],
  villas_et_riads: ["villa", "riad"],
  maisons: ["house", "villa"],
  maisons_et_villas: ["house", "villa"],
  locations_de_vacances: ["apartment", "duplex", "house", "riad", "studio", "villa"],
  colocations: ["apartment", "house", "riad", "studio", "villa"],
  chambre: ["room", "studio", "apartment"],
};

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizeGeoToken(value: string): string {
  return safeDecode(value)
    .replace(/_/g, " ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseAvitoUrl(rawUrl: string): { locationSlug: string | null; categorySlug: string | null } {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { locationSlug: null, categorySlug: null };
  }

  if (!["avito.ma", "www.avito.ma"].includes(url.hostname.toLowerCase())) {
    return { locationSlug: null, categorySlug: null };
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 4 || segments[0]?.toLowerCase() !== "fr") {
    return { locationSlug: null, categorySlug: null };
  }

  return {
    locationSlug: segments[1] ?? null,
    categorySlug: segments[2] ? safeDecode(segments[2]).toLowerCase() : null,
  };
}

function nonEmpty(value: string | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function numericPresent(value: number | string | null): boolean {
  if (value === null || value === "") return false;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed);
}

export function isPropertyTypeCompatible(categorySlug: string | null, propertyType: string | null): boolean {
  if (!categorySlug || !nonEmpty(propertyType)) return false;
  const allowed = CATEGORY_PROPERTY_TYPE_COMPATIBILITY[categorySlug];
  if (!allowed) return false;
  return allowed.includes(propertyType!.trim().toLowerCase());
}

export function isRegistryPublicActivable(registry: AvitoRegistrySnapshot): boolean {
  if (registry.display_gate !== "visible") return false;
  if (!["partner_content", "public_index_result"].includes(registry.display_policy)) return false;
  if (["blocked", "internal_signal_only"].includes(registry.machine_gate)) return false;
  return true;
}

export function buildAvitoInternalRecoveryReport(input: {
  generatedAt: string;
  rows: AvitoUnavailableRow[];
  verticalRules: VerticalRule[];
  geoAliases: GeoAlias[];
  registry: AvitoRegistrySnapshot;
}): AvitoRecoveryReport {
  if (!Number.isFinite(Date.parse(input.generatedAt))) throw new Error("generatedAt must be ISO-compatible");
  if (input.registry.source_domain !== AVITO_DOMAIN) throw new Error("DATA-4.1A requires the Avito Registry row");
  if (input.rows.some((row) => row.normalization_status !== "unavailable")) {
    throw new Error("DATA-4.1A accepts unavailable rows only");
  }

  const realEstateCategories = new Set(
    input.verticalRules
      .filter((rule) => rule.vertical_classification === "real_estate_likely")
      .map((rule) => safeDecode(rule.category_slug).toLowerCase()),
  );
  if (realEstateCategories.size === 0) throw new Error("Avito canonical real-estate category rules are missing");

  const geoAliasSet = new Set(input.geoAliases.map((alias) => normalizeGeoToken(alias.normalized_alias)).filter(Boolean));
  const policyActivable = isRegistryPublicActivable(input.registry);

  const auditedRows: RecoveryRowAudit[] = input.rows.map((row) => {
    const parsed = parseAvitoUrl(row.canonical_url);
    const verticalRealEstate = parsed.categorySlug !== null && realEstateCategories.has(parsed.categorySlug);
    const geoAliasMatch = parsed.locationSlug !== null && geoAliasSet.has(normalizeGeoToken(parsed.locationSlug));
    const hasPropertyType = nonEmpty(row.property_type);
    const propertyTypeCompatible = verticalRealEstate && isPropertyTypeCompatible(parsed.categorySlug, row.property_type);
    const hasIntent = nonEmpty(row.intent);
    const hasStoredCity = nonEmpty(row.city);
    const hasStoredTitle = nonEmpty(row.title);
    const hasStoredSnippet = nonEmpty(row.snippet);
    const hasPrice = numericPresent(row.price_mad);
    const hasSurface = numericPresent(row.surface_m2);

    let recoveryClass: RecoveryClass;
    if (!verticalRealEstate) {
      recoveryClass = "NOISE_OR_NON_LISTING";
    } else if (propertyTypeCompatible && hasIntent && (hasStoredCity || geoAliasMatch)) {
      recoveryClass = "RECOVERABLE_FROM_EXISTING_DATA";
    } else {
      recoveryClass = "INSUFFICIENT_EXISTING_EVIDENCE";
    }

    return {
      canonicalUrl: row.canonical_url,
      categorySlug: parsed.categorySlug,
      locationSlug: parsed.locationSlug,
      seedProvider: row.seed_provider,
      verticalRealEstate,
      geoAliasMatch,
      hasPropertyType,
      propertyTypeCompatible,
      hasIntent,
      hasStoredCity,
      hasStoredTitle,
      hasStoredSnippet,
      hasPrice,
      hasSurface,
      recoveryClass,
      policyBlockedForNewObservation: !policyActivable,
      publicActivable: false,
    };
  });

  const canonicalRows = auditedRows.filter((row) => row.verticalRealEstate);
  const recoverable = auditedRows.filter((row) => row.recoveryClass === "RECOVERABLE_FROM_EXISTING_DATA");
  const insufficient = auditedRows.filter((row) => row.recoveryClass === "INSUFFICIENT_EXISTING_EVIDENCE");
  const noise = auditedRows.filter((row) => row.recoveryClass === "NOISE_OR_NON_LISTING");

  const categoryMap = new Map<string, { rows: number; recoverableCoreRows: number; insufficientRows: number }>();
  for (const row of canonicalRows) {
    const key = row.categorySlug ?? "<unknown>";
    const current = categoryMap.get(key) ?? { rows: 0, recoverableCoreRows: 0, insufficientRows: 0 };
    current.rows += 1;
    if (row.recoveryClass === "RECOVERABLE_FROM_EXISTING_DATA") current.recoverableCoreRows += 1;
    if (row.recoveryClass === "INSUFFICIENT_EXISTING_EVIDENCE") current.insufficientRows += 1;
    categoryMap.set(key, current);
  }

  const total = auditedRows.length;
  const summary = {
    unavailableRows: total,
    canonicalRealEstateRows: canonicalRows.length,
    noiseOrNonListingRows: noise.length,
    recoverableCoreRows: recoverable.length,
    insufficientExistingEvidenceRows: insufficient.length,
    withPropertyType: canonicalRows.filter((row) => row.hasPropertyType).length,
    withCompatiblePropertyType: canonicalRows.filter((row) => row.propertyTypeCompatible).length,
    withIntent: canonicalRows.filter((row) => row.hasIntent).length,
    withGeoAliasMatch: canonicalRows.filter((row) => row.geoAliasMatch || row.hasStoredCity).length,
    withTypeAndIntent: canonicalRows.filter((row) => row.propertyTypeCompatible && row.hasIntent).length,
    withTypeIntentAndGeo: recoverable.length,
    withStoredTitle: canonicalRows.filter((row) => row.hasStoredTitle).length,
    withStoredSnippet: canonicalRows.filter((row) => row.hasStoredSnippet).length,
    withPrice: canonicalRows.filter((row) => row.hasPrice).length,
    withSurface: canonicalRows.filter((row) => row.hasSurface).length,
    policyActivableRows: 0 as const,
    realEstateShare: total === 0 ? 0 : canonicalRows.length / total,
    noiseShare: total === 0 ? 0 : noise.length / total,
  };

  if (summary.canonicalRealEstateRows + summary.noiseOrNonListingRows !== summary.unavailableRows) {
    throw new Error("DATA-4.1A classification does not conserve row count");
  }
  if (policyActivable) {
    throw new Error("DATA-4.1A refuses to run as an internal-only audit when Registry is publicly activable");
  }

  return {
    schemaVersion: "data-4-1a-avito-internal-recovery-audit-v1",
    generatedAt: input.generatedAt,
    sourceDomain: AVITO_DOMAIN,
    readOnly: true,
    sourceNetworkRequests: 0,
    databaseWrites: 0,
    policyChanges: 0,
    registry: input.registry,
    summary,
    categories: [...categoryMap.entries()]
      .map(([categorySlug, value]) => ({ categorySlug, ...value }))
      .sort((a, b) => b.rows - a.rows || a.categorySlug.localeCompare(b.categorySlug)),
    rows: auditedRows,
  };
}

export function renderAvitoRecoveryMarkdown(report: AvitoRecoveryReport): string {
  const pct = (value: number) => `${(value * 100).toFixed(2)}%`;
  const s = report.summary;
  const lines = [
    "# DATA-4.1A — Avito Internal Reservoir Recovery Audit",
    "",
    "**Read-only. Existing AkarFinder data only. No Avito request is performed.**",
    "",
    `- unavailable rows audited: **${s.unavailableRows.toLocaleString("en-US")}**`,
    `- canonical real-estate rows: **${s.canonicalRealEstateRows.toLocaleString("en-US")}** (${pct(s.realEstateShare)})`,
    `- noise / non-listing or unruled rows: **${s.noiseOrNonListingRows.toLocaleString("en-US")}** (${pct(s.noiseShare)})`,
    `- recoverable core rows (compatible type + intent + canonical geo): **${s.recoverableCoreRows.toLocaleString("en-US")}**`,
    `- insufficient existing evidence: **${s.insufficientExistingEvidenceRows.toLocaleString("en-US")}**`,
    `- policy-activable public rows: **${s.policyActivableRows}**`,
    "",
    "## Existing signals inside canonical real-estate rows",
    "",
    `- property type present: **${s.withPropertyType}**`,
    `- category-compatible property type: **${s.withCompatiblePropertyType}**`,
    `- intent: **${s.withIntent}**`,
    `- canonical geo match / stored city: **${s.withGeoAliasMatch}**`,
    `- compatible type + intent: **${s.withTypeAndIntent}**`,
    `- compatible type + intent + geo: **${s.withTypeIntentAndGeo}**`,
    `- stored title: **${s.withStoredTitle}**`,
    `- stored snippet: **${s.withStoredSnippet}**`,
    `- price: **${s.withPrice}**`,
    `- surface: **${s.withSurface}**`,
    "",
    "## Canonical categories",
    "",
    "| Category | Rows | Core recoverable | Insufficient |",
    "|---|---:|---:|---:|",
    ...report.categories.map((row) => `| ${row.categorySlug} | ${row.rows} | ${row.recoverableCoreRows} | ${row.insufficientRows} |`),
    "",
    "## Decision",
    "",
    "AkarFinder must not treat the full Avito Common Crawl reservoir as real-estate inventory. Only canonical vertical-category rows enter recovery analysis, and a row is core-recoverable only when its stored property type is compatible with that category. Ambiguous categories fail closed. Core recovery remains internal-only and is not public inventory while Source Registry keeps Avito hidden/internal-only.",
    "",
  ];
  return `${lines.join("\n")}\n`;
}
