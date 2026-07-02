import { existsSync } from "node:fs";
import { join } from "node:path";
import { queryListings } from "@/lib/db/index";
import { getDbProvider, isSupabaseConfigured } from "@/lib/db/provider";
import { mapDbRowToListing } from "@/lib/listings/map-db-listing";
import { canPublishDbRowToPublicSurface } from "@/lib/listings/public-listing-access";
import { mockListings } from "@/lib/listings/mock-listings";
import type { Listing, ListingTransactionType } from "@/lib/listings/types";

export type MarketPulseOperationLabel = "Location" | "Vente" | "Neuf";

export type MarketPulseItem = {
  id: string;
  href?: string;
  operationLabel: MarketPulseOperationLabel;
  city: string;
  neighborhood?: string;
  propertyType?: string;
  priceLabel?: string;
  shortDetail: string;
  lineLabel: string;
};

const SQLITE_DB_PATH = join(
  process.cwd(),
  "scripts/scrapers/output/akarfinder.db"
);

const FORBIDDEN_WORDING = [
  "temps reel",
  "temps réel",
  "donnees verifiees",
  "données vérifiées",
  "annonce verifiee",
  "annonce vérifiée",
  "prix certifie",
  "prix certifié",
  "disponibilite garantie",
  "disponibilité garantie",
  "bien confirme",
  "bien confirmé",
];

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function containsForbiddenMarketPulseWording(value: string): boolean {
  const normalized = normalizeText(value);
  return FORBIDDEN_WORDING.some((token) => normalized.includes(normalizeText(token)));
}

export function mapMarketPulseOperationLabel(
  transactionType: string | null | undefined
): MarketPulseOperationLabel | null {
  const normalized = (transactionType ?? "").trim().toLowerCase();

  if (
    normalized === "rent" ||
    normalized === "location" ||
    normalized === "louer"
  ) {
    return "Location";
  }

  if (
    normalized === "buy" ||
    normalized === "sale" ||
    normalized === "vente" ||
    normalized === "acheter" ||
    normalized === "achat"
  ) {
    return "Vente";
  }

  if (normalized === "new" || normalized === "neuf") {
    return "Neuf";
  }

  return null;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export function formatMarketPulsePrice(
  price: number | null | undefined,
  transactionType: ListingTransactionType | string | null | undefined
): string {
  if (price == null || price <= 0) return "";

  const operationLabel = mapMarketPulseOperationLabel(transactionType);
  const suffix = operationLabel === "Location" ? " DH/mois" : " DH";
  return `${formatNumber(price)}${suffix}`;
}

export function getMarketPulseShortDetail(
  listing: Pick<
    Listing,
    "surface_m2" | "bedrooms" | "bedrooms_count" | "price_per_m2" | "reliability_score" | "transaction_type"
  >
): string {
  if (listing.surface_m2 > 0) {
    return `${listing.surface_m2} m²`;
  }

  const bedrooms = listing.bedrooms_count ?? listing.bedrooms ?? 0;
  if (bedrooms > 0) {
    return `${bedrooms} ch`;
  }

  if (listing.transaction_type === "new") {
    return "Programme neuf";
  }

  if (listing.price_per_m2 > 0 && listing.transaction_type !== "rent") {
    return "Prix observé disponible";
  }

  if (listing.reliability_score >= 50) {
    return "Score indicatif disponible";
  }

  return "";
}

export function getMarketPulseHref(id: string | null | undefined): string | undefined {
  if (!id || !id.trim()) return undefined;
  return `/listings/${encodeURIComponent(id)}`;
}

export function isPresentableMarketPulseListing(listing: Listing): boolean {
  if (!listing.id?.trim()) return false;
  if (!listing.title?.trim()) return false;
  if (!listing.city?.trim()) return false;

  if (
    typeof listing.reliability_score === "number" &&
    listing.reliability_score < 50
  ) {
    return false;
  }

  if (
    typeof listing.duplicate_score === "number" &&
    listing.duplicate_score >= 80
  ) {
    return false;
  }

  if (
    typeof listing.data_completeness_score === "number" &&
    listing.data_completeness_score > 0 &&
    listing.data_completeness_score < 40
  ) {
    return false;
  }

  const operationLabel = mapMarketPulseOperationLabel(listing.transaction_type);
  if (!operationLabel) return false;

  const shortDetail = getMarketPulseShortDetail(listing);
  const priceLabel = formatMarketPulsePrice(listing.price, listing.transaction_type);

  if (!priceLabel && !shortDetail) return false;

  return true;
}

export function buildMarketPulseItem(listing: Listing): MarketPulseItem | null {
  if (!isPresentableMarketPulseListing(listing)) {
    return null;
  }

  const operationLabel = mapMarketPulseOperationLabel(listing.transaction_type);
  if (!operationLabel) return null;

  const priceLabel = formatMarketPulsePrice(listing.price, listing.transaction_type);
  const shortDetail = getMarketPulseShortDetail(listing) || "Repère disponible";
  const locationLabel = listing.neighborhood?.trim()
    ? `${listing.city} — ${listing.neighborhood}`
    : listing.city;
  const propertyType = listing.property_type?.trim() || undefined;
  const lineParts = [locationLabel, propertyType, shortDetail, priceLabel].filter(Boolean);
  const lineLabel = lineParts.join(" · ");

  if (containsForbiddenMarketPulseWording(lineLabel)) {
    return null;
  }

  return {
    id: listing.id,
    href: getMarketPulseHref(listing.id),
    operationLabel,
    city: listing.city,
    neighborhood: listing.neighborhood?.trim() || undefined,
    propertyType,
    priceLabel: priceLabel || undefined,
    shortDetail,
    lineLabel,
  };
}

export function buildMarketPulseItems(
  listings: Listing[],
  maxItems = 10
): MarketPulseItem[] {
  const items: MarketPulseItem[] = [];
  const seenKeys = new Set<string>();

  for (const listing of listings) {
    if (items.length >= maxItems) break;

    const item = buildMarketPulseItem(listing);
    if (!item) continue;

    const dedupeKey =
      listing.duplicate_group_id?.trim() ||
      `${normalizeText(item.lineLabel)}::${normalizeText(item.operationLabel)}`;

    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);
    items.push(item);
  }

  return items;
}

export function shouldUseMockMarketPulseFallback(
  fetchedCount: number,
  hasSupabaseProvider: boolean,
  hasSqliteProvider: boolean
): boolean {
  return fetchedCount === 0 && !hasSupabaseProvider && !hasSqliteProvider;
}

export async function getMarketPulseListings(
  maxItems = 10
): Promise<MarketPulseItem[]> {
  const { listings } = await queryListings({ limit: 36 });
  // HOME-MOTOR-PURITY-WORDING-1: only authorized sources may appear on the home ticker.
  const authorizedListings = listings.filter(canPublishDbRowToPublicSurface);
  const dbListings = authorizedListings.map((row) => mapDbRowToListing(row));
  const dbItems = buildMarketPulseItems(dbListings, maxItems);

  if (dbItems.length > 0) {
    return dbItems;
  }

  const hasSupabaseProvider =
    getDbProvider() === "supabase" && isSupabaseConfigured();
  const hasSqliteProvider = existsSync(SQLITE_DB_PATH);

  if (
    shouldUseMockMarketPulseFallback(
      authorizedListings.length,
      hasSupabaseProvider,
      hasSqliteProvider
    )
  ) {
    return buildMarketPulseItems(mockListings, maxItems);
  }

  return [];
}
