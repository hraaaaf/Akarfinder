// Maps a DbListingRow (property_listings + listing_sources) to the shared
// frontend Listing type.
// PII guard: never exposes phone numbers or email addresses.
// P6: reads persisted reliability/duplicate fields from DB when available.
import type { DbListingRow } from "@/lib/listings/db-listings";
import type {
  Listing,
  ListingPropertyType,
  ListingTransactionType,
} from "@/lib/listings/types";
import {
  computeReliabilityScore,
  badgeFromScore,
  type ReliabilityBadgeLabel,
} from "@/lib/listings/reliability";
import { computeSearchResultDisplayPolicy } from "@/lib/search/search-result-display-model";

const PHONE_RE = /(\+212|0[5-7])\d{8}/;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

function containsPii(value: string | null): boolean {
  if (!value) return false;
  return PHONE_RE.test(value) || EMAIL_RE.test(value);
}

function toTitleCase(value: string | null) {
  if (!value) return undefined;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function mapPropertyType(raw: string | null): ListingPropertyType {
  switch (raw) {
    case "apartment":
      return "Appartement";
    case "villa":
      return "Villa";
    case "land":
      return "Terrain";
    case "office":
      return "Bureau";
    default:
      return "Appartement";
  }
}

function mapTransactionType(raw: string | null): ListingTransactionType {
  if (raw === "rent") return "rent";
  if (raw === "new") return "new";
  return "buy";
}

function getFreshnessLabel(updatedAt: string) {
  const parsed = new Date(updatedAt).getTime();
  if (Number.isNaN(parsed)) {
    return "Mise Ã  jour rÃ©cente";
  }

  const diffMs = Date.now() - parsed;
  const days = Math.max(0, Math.floor(diffMs / 86_400_000));

  if (days === 0) return "Mise Ã  jour aujourd'hui";
  if (days === 1) return "Mise Ã  jour hier";
  if (days < 7) return `Mise Ã  jour il y a ${days} j`;
  if (days < 30) return `Mise Ã  jour il y a ${Math.floor(days / 7)} sem.`;
  return `Mise Ã  jour il y a ${Math.floor(days / 30)} mois`;
}

function parseJsonSafe<T>(s: string | null | undefined): T | null {
  if (!s) return null;
  try { return JSON.parse(s) as T; } catch { return null; }
}

// V9.5 â€” computed display policy from source name (no DB migration required).
// Never assigns premium_partner / authorized_source / contact by fallback.
// Exported for unit tests (source-display-policy.test.ts).
type V95DisplayPolicy = {
  source_display_type?: string;
  source_badge?: string;
  display_depth?: string;
  thumbnail_policy?: string;
  original_source_required?: boolean;
  allowed_ctas?: string[];
  source_attribution_label?: string;
  display_policy_reason?: string;
  display_images?: { policy?: string; urls?: string[] };
};

function buildPublicIndexedPolicy(reason: string): V95DisplayPolicy {
  return {
    source_display_type: "public_index_source",
    source_badge: "public_indexed",
    display_depth: "limited_preview",
    thumbnail_policy: "single_thumbnail_allowed",
    original_source_required: true,
    allowed_ctas: ["view_original", "view_source", "compare"],
    source_attribution_label: "Source publique indexee",
    display_policy_reason: reason,
    display_images: { policy: "single_thumbnail_allowed", urls: [] },
  };
}

export function deriveSourceDisplayPolicy(rawSourceName: string | null): V95DisplayPolicy {
  const src = (rawSourceName ?? "").toLowerCase().trim();

  if (src === "mubawab") {
    return buildPublicIndexedPolicy(
      "Source publique indexee - apercu limite, redirection vers le site original."
    );
  }

  if (src === "agenz") {
    return buildPublicIndexedPolicy(
      "Source publique indexee candidate - apercu limite autorise, review policy/ToS encore requise."
    );
  }

  if (
    src === "logicimmo" ||
    src === "logic-immo" ||
    src === "logic immo" ||
    src === "logicimmo maroc" ||
    src === "logic-immo maroc" ||
    src === "logic immo maroc"
  ) {
    return buildPublicIndexedPolicy(
      "Source publique indexee candidate - apercu limite autorise, review policy/ToS encore requise."
    );
  }

  if (src === "avito") {
    return {
      source_display_type: "audit_source",
      source_badge: "market_signal",
      display_depth: "market_signal_only",
      thumbnail_policy: "no_listing_image",
      original_source_required: true,
      allowed_ctas: ["view_market_signal", "view_source"],
      source_attribution_label: "Signal marche",
      display_policy_reason:
        "Source utilisee uniquement comme signal marche. Aucune annonce n'est republiee.",
      display_images: { policy: "no_listing_image", urls: [] },
    };
  }

  return {};
}

export type DuplicateOverride = {
  group_id: string;
  score: number;
};

export function mapDbRowToListing(
  row: DbListingRow,
  duplicate?: DuplicateOverride
): Listing {
  const priceMad = row.price_mad ?? 0;
  const surface = row.surface_m2 ?? 0;
  const pricePerM2 =
    priceMad > 0 && surface > 0 ? Math.round(priceMad / surface) : 0;
  const dataCompletenessScore = row.data_completeness_score ?? 0;

  const sellerName = containsPii(row.seller_name) ? undefined : row.seller_name ?? undefined;
  const description = containsPii(row.description_snippet)
    ? ""
    : row.description_snippet ?? "";

  // P6: prefer persisted scores when both duplicate_score and reliability_score
  // are present in the DB row. Fall back to on-the-fly computation otherwise.
  const hasPersisted =
    row.reliability_score != null && row.duplicate_score != null;

  const finalDuplicateScore = hasPersisted
    ? (row.duplicate_score ?? 0)
    : (duplicate?.score ?? 0);

  const finalGroupId = hasPersisted
    ? (row.duplicate_group_id ?? String(row.id))
    : (duplicate?.group_id ?? String(row.id));

  let reliabilityScore: number;
  let reliabilityBadge: ReliabilityBadgeLabel;
  let reliabilityReasons: string[];

  if (hasPersisted) {
    reliabilityScore = row.reliability_score!;
    reliabilityBadge =
      (row.reliability_badge as ReliabilityBadgeLabel) ??
      badgeFromScore(reliabilityScore);
    reliabilityReasons = parseJsonSafe<string[]>(row.reliability_reasons) ?? [];
  } else {
    const computed = computeReliabilityScore({
      data_completeness_score: dataCompletenessScore,
      field_confidence_json: row.field_confidence,
      price_mad: row.price_mad,
      surface_m2: row.surface_m2,
      city: row.city,
      description_snippet: row.description_snippet,
      seller_name: sellerName ?? null,
      images_count: row.images_count,
      duplicate_score: finalDuplicateScore,
    });
    reliabilityScore = computed.score;
    reliabilityBadge = computed.badge;
    reliabilityReasons = computed.reasons;
  }

  return {
    id: String(row.id),
    title: row.title ?? "Bien immobilier",
    city: row.city ?? "Maroc",
    neighborhood: row.district ?? "",
    price: priceMad,
    price_mad: priceMad,
    currency: "DH",
    surface_m2: surface,
    price_per_m2: pricePerM2,
    property_type: mapPropertyType(row.property_type),
    transaction_type: mapTransactionType(row.transaction_type),
    bedrooms: row.bedrooms_count ?? 0,
    bathrooms: row.bathrooms_count ?? 0,
    rooms_count: row.rooms_count ?? undefined,
    bedrooms_count: row.bedrooms_count ?? undefined,
    bathrooms_count: row.bathrooms_count ?? undefined,
    district: row.district ?? undefined,
    freshness_label: getFreshnessLabel(row.updated_at),
    source_type: "Source analysée",
    reliability_label: "À vérifier",
    reliability_score: reliabilityScore,
    reliability_available: true,
    is_mre_friendly: false,
    description,
    description_snippet: description || undefined,
    image_url: "",
    images_count: row.images_count ?? undefined,
    seller_name: sellerName,
    reliability_explanation:
      "Score calculé sur la complétude, la cohérence des données et la présence de doublons.",
    data_completeness_score: dataCompletenessScore,
    source_name: toTitleCase(row.source_name),
    listing_url: row.listing_url ?? undefined,
    duplicate_group_id: finalGroupId,
    duplicate_score: finalDuplicateScore,
    reliability_badge: reliabilityBadge,
    reliability_reasons: reliabilityReasons,
    // P8A: advanced characteristics (optional; only present when extracted).
    ...(row.built_surface_m2 != null && { built_surface_m2: row.built_surface_m2 }),
    ...(row.plot_surface_m2 != null && { plot_surface_m2: row.plot_surface_m2 }),
    ...(row.condition && { condition: row.condition }),
    ...(row.property_age_range && { property_age_range: row.property_age_range }),
    ...(row.orientation && { orientation: row.orientation }),
    ...(row.floor_type && { floor_type: row.floor_type }),
    ...(row.floors_count != null && { floors_count: row.floors_count }),
    ...(row.garden_m2 != null && { garden_m2: row.garden_m2 }),
    ...(row.terrace_m2 != null && { terrace_m2: row.terrace_m2 }),
    ...(row.garage_spaces != null && { garage_spaces: row.garage_spaces }),
    // SQLite stores booleans as INTEGER 0/1; Supabase as boolean.
    has_pool: !!(row.has_pool),
    has_concierge: !!(row.has_concierge),
    has_moroccan_living_room: !!(row.has_moroccan_living_room),
    has_european_living_room: !!(row.has_european_living_room),
    has_equipped_kitchen: !!(row.has_equipped_kitchen),
    premium_features: parseJsonSafe<string[]>(row.premium_features) ?? [],
    // V9.5 â€” source display policy (computed from source_name, additive opt-in).
    ...deriveSourceDisplayPolicy(row.source_name),
    // SEARCH-RESULT-DISPLAY-MODEL-1 â€” SERP display policy (additive).
    ...(() => {
      const dp = deriveSourceDisplayPolicy(row.source_name);
      const serpPolicy = computeSearchResultDisplayPolicy({
        source_id: row.source_name?.toLowerCase().trim() ?? null,
        source_name: row.source_name ?? null,
        source_display_type: dp.source_display_type ?? null,
        source_badge: dp.source_badge ?? null,
        display_depth: dp.display_depth ?? null,
        result_origin: "direct_source",
        original_url: row.listing_url ?? null,
        is_partner: false,
        has_title: !!(row.title),
        has_snippet: !!description,
        has_thumbnail: (dp.display_images?.urls?.length ?? 0) > 0,
      });
      return {
        search_result_display_mode: serpPolicy.search_result_display_mode,
        result_origin: serpPolicy.result_origin,
        can_show_result: serpPolicy.can_show_result,
        can_show_thumbnail: serpPolicy.can_show_thumbnail,
        can_show_snippet: serpPolicy.can_show_snippet,
        can_show_contact: serpPolicy.can_show_contact,
        can_show_gallery: serpPolicy.can_show_gallery,
        primary_cta: serpPolicy.primary_cta,
        production_allowed: serpPolicy.production_allowed,
        ...(serpPolicy.production_block_reason
          ? { production_block_reason: serpPolicy.production_block_reason }
          : {}),
      };
    })(),
  };
}
