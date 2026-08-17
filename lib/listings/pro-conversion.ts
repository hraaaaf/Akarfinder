import type { Listing } from "@/lib/listings/types";

export type ProConversionModel = {
  professional: {
    name: string | null;
    sourceLabel: string | null;
    badgeLabel: string | null;
  };
  actions: {
    visit: boolean;
    whatsapp: { enabled: boolean; phone: string | null };
    phone: { enabled: false; phone: null };
    sourceOriginal: { enabled: boolean; url: string | null };
  };
  contactAuthorized: boolean;
};

function clean(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function hasAllowedCta(listing: Listing, value: string): boolean {
  return Array.isArray(listing.allowed_ctas) && listing.allowed_ctas.includes(value);
}

function buildBadgeLabel(listing: Listing): string | null {
  const validated =
    listing.partner_activation_status === "active" &&
    listing.source_authorization_status === "confirmed" &&
    listing.partner_validation_status === "validated";
  if (!validated) return null;

  if (listing.partner_type === "promoter" || listing.organization_type === "promoter") {
    return listing.commercial_tier === "premium" ? "Promoteur premium" : "Promoteur partenaire";
  }
  if (listing.partner_type === "agency" || listing.organization_type === "agency") {
    if (listing.commercial_tier === "gold" || listing.partner_tier === "agency_premium") return "Agence Gold";
    return "Agence partenaire";
  }
  return null;
}

export function buildProConversionModel(listing: Listing): ProConversionModel {
  const partnerSurface = listing.source_access_level === "partner_full";
  const contactAuthorized = partnerSurface && listing.can_show_contact === true;
  const whatsappPhone = clean(listing.whatsapp);

  return {
    professional: {
      name: clean(listing.seller_name) ?? clean(listing.source_name),
      sourceLabel: clean(listing.source_attribution_label) ?? clean(listing.source_name),
      badgeLabel: buildBadgeLabel(listing),
    },
    actions: {
      visit: contactAuthorized && hasAllowedCta(listing, "visit"),
      whatsapp: {
        enabled: contactAuthorized && hasAllowedCta(listing, "whatsapp") && whatsappPhone !== null,
        phone: contactAuthorized && hasAllowedCta(listing, "whatsapp") ? whatsappPhone : null,
      },
      // No dedicated, explicitly-authorized public phone field exists in Listing today.
      // Never infer a telephone CTA from seller text or from the WhatsApp number.
      phone: { enabled: false, phone: null },
      sourceOriginal: {
        enabled: clean(listing.listing_url) !== null,
        url: clean(listing.listing_url),
      },
    },
    contactAuthorized,
  };
}
