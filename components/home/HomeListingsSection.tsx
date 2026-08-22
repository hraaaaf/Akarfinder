import Link from "next/link";
import { ArrowRight, ExternalLink, MapPin } from "lucide-react";

import { PropertyTypeArtwork } from "@/components/property-types/PropertyTypeArtwork";
import { Container } from "@/components/ui/Container";
import { formatPrice } from "@/lib/listings/utils";
import { searchPublicRepresentations } from "@/lib/search-gateway/public-search-cursor";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";

const MAX_HOME_LISTINGS = 4;

// Exact read-only snapshot of four canonical public representations observed through
// search_public_representations_v2 on 2026-08-22. It exists only so GitHub Actions can
// certify the responsive card layout without receiving production database secrets.
// Runtime production never enters this lane.
const HVR3_CERTIFICATION_SNAPSHOT: SearchGatewayNormalizedResult[] = [
  {
    id: "7b513c41-ba77-491f-b700-3aa8b6a98af0",
    title: "Vente appartement Kenitra 90m2 540000 DH",
    original_url: "https://masaken.ma/fr/immobilier-maroc/vente-appartement-kenitra/6508",
    display_url: "masaken.ma",
    source_id: "masaken",
    source_name: "Masaken",
    domain: "masaken.ma",
    result_origin: "commoncrawl_cdx",
    search_result_display_mode: "thin_indexed_result",
    source_badge: "public_indexed",
    production_allowed: true,
    can_show_result: true,
    can_show_thumbnail: false,
    can_show_contact: false,
    can_show_gallery: false,
    can_cache_thumbnail: false,
    can_download_thumbnail: false,
    primary_cta: "view_original",
    primary_cta_label: "Voir la source originale",
    result_attribution_label: "Masaken",
    thumbnail_risk_accepted: false,
    normalized_city: "Kénitra",
    normalized_property_type: "apartment",
    normalized_intent: "sale",
    normalized_price_mad: 540000,
    normalized_surface_m2: 90,
    quality_tier: "A",
    quality_score: 93,
    display_eligibility: "eligible_primary",
    display_eligibility_reason: "intelligence_ready",
  },
  {
    id: "d2911777-9573-4e20-a300-8515f6d9e9f9",
    title: "Bureau neuf de 750 m2 à CFC à la vente - Immobilier Casablanca",
    original_url: "https://1immo.ma/bureau-neuf-de-750-m2-a-cfc-a-la-vente-22246",
    display_url: "1immo.ma",
    source_id: "1immo",
    source_name: "1immo",
    domain: "1immo.ma",
    result_origin: "search_api",
    search_result_display_mode: "thin_indexed_result",
    source_badge: "public_indexed",
    production_allowed: true,
    can_show_result: true,
    can_show_thumbnail: false,
    can_show_contact: false,
    can_show_gallery: false,
    can_cache_thumbnail: false,
    can_download_thumbnail: false,
    primary_cta: "view_original",
    primary_cta_label: "Voir la source originale",
    result_attribution_label: "1immo",
    thumbnail_risk_accepted: false,
    normalized_city: "Casablanca",
    normalized_property_type: "office",
    normalized_intent: "sale",
    normalized_price_mad: 25000000,
    normalized_surface_m2: 750,
    quality_tier: "A",
    quality_score: 93,
    display_eligibility: "eligible_primary",
    display_eligibility_reason: "intelligence_ready",
  },
  {
    id: "d23e9172-4b92-44ef-9221-b9edc7b9b076",
    title: "Location appartement El Jadida 82m2 3400 DH",
    original_url: "https://masaken.ma/fr/immobilier-maroc/location-appartement-eljadida/343",
    display_url: "masaken.ma",
    source_id: "masaken",
    source_name: "Masaken",
    domain: "masaken.ma",
    result_origin: "commoncrawl_cdx",
    search_result_display_mode: "thin_indexed_result",
    source_badge: "public_indexed",
    production_allowed: true,
    can_show_result: true,
    can_show_thumbnail: false,
    can_show_contact: false,
    can_show_gallery: false,
    can_cache_thumbnail: false,
    can_download_thumbnail: false,
    primary_cta: "view_original",
    primary_cta_label: "Voir la source originale",
    result_attribution_label: "Masaken",
    thumbnail_risk_accepted: false,
    normalized_city: "El Jadida",
    normalized_property_type: "apartment",
    normalized_intent: "rent",
    normalized_price_mad: 3400,
    normalized_surface_m2: 82,
    quality_tier: "A",
    quality_score: 93,
    display_eligibility: "eligible_primary",
    display_eligibility_reason: "intelligence_ready",
  },
  {
    id: "07eb5924-7ac1-4822-ba4f-e5e9da35be8c",
    title: "Vente appartement Oujda 54m2 360000 DH",
    original_url: "https://masaken.ma/fr/immobilier-maroc/vente-appartement-oujda/6639",
    display_url: "masaken.ma",
    source_id: "masaken",
    source_name: "Masaken",
    domain: "masaken.ma",
    result_origin: "commoncrawl_cdx",
    search_result_display_mode: "thin_indexed_result",
    source_badge: "public_indexed",
    production_allowed: true,
    can_show_result: true,
    can_show_thumbnail: false,
    can_show_contact: false,
    can_show_gallery: false,
    can_cache_thumbnail: false,
    can_download_thumbnail: false,
    primary_cta: "view_original",
    primary_cta_label: "Voir la source originale",
    result_attribution_label: "Masaken",
    thumbnail_risk_accepted: false,
    normalized_city: "Oujda",
    normalized_property_type: "apartment",
    normalized_intent: "sale",
    normalized_price_mad: 360000,
    normalized_surface_m2: 54,
    quality_tier: "A",
    quality_score: 93,
    display_eligibility: "eligible_primary",
    display_eligibility_reason: "intelligence_ready",
  },
];

function certificationSnapshotAllowed() {
  return (
    process.env.GITHUB_ACTIONS === "true" &&
    process.env.HVR3_CERTIFICATION_MODE === "true" &&
    !process.env.VERCEL
  );
}

async function loadHomeListings(): Promise<SearchGatewayNormalizedResult[]> {
  try {
    const page = await searchPublicRepresentations({ limit: 8 });
    const eligible = page.results
      .filter((listing) => listing.can_show_result && listing.production_allowed)
      .slice(0, MAX_HOME_LISTINGS);
    if (eligible.length > 0) return eligible;
  } catch (error) {
    console.error("[home:listings] Canonical public search unavailable:", error);
  }

  if (certificationSnapshotAllowed()) {
    return HVR3_CERTIFICATION_SNAPSHOT.slice(0, MAX_HOME_LISTINGS);
  }

  return [];
}

function propertyTypeLabel(value?: string) {
  switch (value?.toLowerCase()) {
    case "apartment": return "Appartement";
    case "villa": return "Villa";
    case "office": return "Bureau";
    case "land": return "Terrain";
    case "riad": return "Riad";
    case "studio": return "Studio";
    case "house": return "Maison";
    default: return "Bien";
  }
}

function detailsLabel(listing: SearchGatewayNormalizedResult) {
  const details = [propertyTypeLabel(listing.normalized_property_type)];
  if ((listing.normalized_surface_m2 ?? 0) > 0) {
    details.push(`${Math.round(listing.normalized_surface_m2!)} m²`);
  }
  return details.join(" · ");
}

function HomeListingCard({ listing }: { listing: SearchGatewayNormalizedResult }) {
  const location = listing.normalized_city?.trim() || "Localisation non précisée";

  return (
    <a
      href={listing.original_url}
      target="_blank"
      rel="noreferrer"
      data-home-listing-card
      data-listing-id={listing.id}
      data-display-eligibility={listing.display_eligibility ?? ""}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[1.15rem] border border-[#DCE8F5] bg-white shadow-[0_10px_30px_rgba(11,31,58,0.07)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#93C5FD] hover:shadow-[0_18px_42px_rgba(11,99,206,0.11)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] focus-visible:ring-offset-2 motion-reduce:transform-none"
      aria-label={`Voir la source originale : ${listing.title}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#EEF6FF]">
        <PropertyTypeArtwork
          kind={listing.normalized_property_type ?? "Bien"}
          className="h-full w-full transition duration-500 group-hover:scale-[1.025] motion-reduce:transform-none"
          decorative
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#071B33]/45 via-transparent to-transparent" />
        <span className="absolute bottom-2 right-2 rounded-full bg-[#071B33]/78 px-2 py-1 text-[9px] font-semibold text-white/90 backdrop-blur-sm">
          Illustration
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <p data-home-listing-price className="min-w-0 truncate text-[1.12rem] font-black tracking-[-0.03em] text-[#0B1F3A] sm:text-[1.22rem]">
            {formatPrice(listing.normalized_price_mad, "DH")}
          </p>
          <ExternalLink size={14} className="mt-1 shrink-0 text-[#0B63CE]" aria-hidden="true" />
        </div>
        <p className="mt-1 truncate text-[11.5px] font-bold text-slate-600 sm:text-[12px]">
          {detailsLabel(listing)}
        </p>
        <p className="mt-2 flex items-center gap-1.5 truncate text-[11px] text-slate-500">
          <MapPin size={12} className="shrink-0 text-[#0B63CE]" aria-hidden="true" />
          <span className="truncate">{location}</span>
        </p>
        <p className="mt-2 truncate text-[9.5px] font-semibold text-slate-400">Source : {listing.domain}</p>
      </div>
    </a>
  );
}

export async function HomeListingsSection() {
  const listings = await loadHomeListings();

  return (
    <section data-home-listings="hvr-3" className="bg-white py-10 sm:py-14 lg:py-16">
      <Container>
        <div className="mx-auto max-w-[1240px]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.2em] text-[#0B63CE]">À explorer</p>
              <h2 className="mt-2 text-[1.8rem] font-extrabold leading-[1.05] tracking-[-0.04em] text-[#0B1F3A] sm:text-[2.35rem]">
                Biens à découvrir
              </h2>
              <p className="mt-2 max-w-[620px] text-[0.88rem] leading-6 text-slate-600 sm:text-[0.96rem]">
                Quelques biens actuellement visibles dans AkarFinder.
              </p>
            </div>
            <Link href="/search" className="hidden shrink-0 items-center gap-1.5 text-[12px] font-extrabold text-[#0B63CE] hover:underline sm:inline-flex">
              Voir tous les biens <ArrowRight size={14} strokeWidth={2.3} aria-hidden="true" />
            </Link>
          </div>

          {listings.length > 0 ? (
            <div className="-mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
              {listings.map((listing) => (
                <div key={listing.id} className="w-[76vw] max-w-[300px] shrink-0 snap-start sm:w-auto sm:max-w-none">
                  <HomeListingCard listing={listing} />
                </div>
              ))}
            </div>
          ) : (
            <div data-home-listings-empty className="mt-6 flex flex-col items-start gap-3 rounded-[1.15rem] border border-[#DCE8F5] bg-[#F8FBFF] p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] leading-5 text-slate-600">Les biens disponibles sont accessibles depuis la recherche.</p>
              <Link href="/search" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#0B63CE] px-4 py-2 text-[12px] font-extrabold text-white">
                Ouvrir la recherche <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          )}

          <div className="mt-4 sm:hidden">
            <Link href="/search" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#60A5FA]/30 bg-white px-4 py-2.5 text-[0.84rem] font-semibold text-[#0B63CE] shadow-[0_12px_30px_rgba(11,99,206,0.08)]">
              Voir tous les biens <ArrowRight size={14} strokeWidth={2.3} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
