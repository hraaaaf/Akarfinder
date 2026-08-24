import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";

const CONTACT_PATTERNS = [/wa\.me/gi, /api\.whatsapp/gi, /whatsapp/gi, /tel:/gi];

function sanitizeVisibleText(value: string | null | undefined): string | null {
  if (!value) return null;
  const sanitized = CONTACT_PATTERNS.reduce(
    (accumulator, pattern) => accumulator.replace(pattern, ""),
    value,
  )
    .replace(/\s{2,}/g, " ")
    .trim();
  return sanitized || null;
}

function finitePositive(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value > 0 ? value : null;
}

function humanizePropertyType(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const labels: Record<string, string> = {
    apartment: "Appartement",
    appartement: "Appartement",
    villa: "Villa",
    house: "Maison",
    maison: "Maison",
    studio: "Studio",
    land: "Terrain",
    terrain: "Terrain",
    office: "Bureau",
    bureau: "Bureau",
    riad: "Riad",
    commercial: "Local commercial",
  };
  if (labels[normalized]) return labels[normalized];
  const humanized = normalized.replace(/[_-]+/g, " ");
  return humanized.charAt(0).toUpperCase() + humanized.slice(1);
}

function humanizeIntent(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (["buy", "sale", "achat", "vente"].includes(normalized)) return "Vente";
  if (["rent", "rental", "location", "louer"].includes(normalized)) return "Location";
  if (["new", "neuf"].includes(normalized)) return "Neuf";
  return null;
}

export function isExternalMinimalResult(result: SearchGatewayNormalizedResult): boolean {
  return (
    result.display_eligibility_reason === "external_minimal_index" ||
    result.quality_tier === "Q0_link_only"
  );
}

export function buildExternalResultPresentation(result: SearchGatewayNormalizedResult) {
  const isMinimal = isExternalMinimalResult(result);
  const city = sanitizeVisibleText(result.normalized_city);
  const sourceHost = sanitizeVisibleText(result.domain) || "Source externe";
  const generatedFallbackTitle = city ? `Annonce immobilière à ${city}` : "Annonce immobilière";

  return {
    isMinimal,
    title: sanitizeVisibleText(result.title) || generatedFallbackTitle,
    sourceHost,
    displayUrl: sanitizeVisibleText(result.display_url),
    city,
    propertyType: humanizePropertyType(result.normalized_property_type),
    intentLabel: humanizeIntent(result.normalized_intent),
    snippet: isMinimal ? null : sanitizeVisibleText(result.snippet),
    priceMad: isMinimal ? null : finitePositive(result.normalized_price_mad),
    surfaceM2: isMinimal ? null : finitePositive(result.normalized_surface_m2),
    pricePerM2Mad: isMinimal ? null : finitePositive(result.price_per_m2_mad),
  };
}
