"use client";

import { PropertySelectionProvider } from "@/components/search/PropertySelectionProvider";
import { SearchListingCardDark } from "@/components/search/SearchListingCardDark";
import type { Listing } from "@/lib/listings/types";

const INDEXED_LISTINGS: Listing[] = [
  {
    id: "visual-qa-indexed-buy",
    title: "Appartement à vendre à Bourgogne",
    city: "Casablanca",
    neighborhood: "Bourgogne",
    price: 1600000,
    currency: "DH",
    surface_m2: 110,
    price_per_m2: 14545,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 3,
    bathrooms: 2,
    freshness_label: "Indexée récemment",
    source_type: "Source analysée",
    reliability_label: "Infos limitées",
    reliability_score: 64,
    is_mre_friendly: false,
    description: "Fixture visuelle public_indexed achat.",
    image_url: "",
    reliability_explanation: "Fixture de certification visuelle.",
    source_name: "OpenSERP",
    listing_url: "https://example.com/visual-qa-buy",
    source_display_type: "public_index_source",
    source_badge: "public_indexed",
    display_depth: "limited_preview",
    allowed_ctas: ["view_original"],
    thumbnail_policy: "no_listing_image",
    original_source_required: true,
    source_attribution_label: "Source publique indexée",
    search_result_display_mode: "indexed_result",
    result_origin: "search_api",
    can_show_result: true,
    can_show_thumbnail: false,
    can_show_snippet: true,
    can_show_contact: false,
    can_show_gallery: false,
    primary_cta: "view_original",
    production_allowed: true,
  },
  {
    id: "visual-qa-indexed-rent",
    title: "Appartement à louer à Palmier",
    city: "Casablanca",
    neighborhood: "Palmier",
    price: 6500,
    currency: "DH",
    surface_m2: 85,
    price_per_m2: 76,
    property_type: "Appartement",
    transaction_type: "rent",
    bedrooms: 2,
    bathrooms: 1,
    freshness_label: "Indexée récemment",
    source_type: "Source analysée",
    reliability_label: "Infos limitées",
    reliability_score: 61,
    is_mre_friendly: false,
    description: "Fixture visuelle public_indexed location.",
    image_url: "",
    reliability_explanation: "Fixture de certification visuelle.",
    source_name: "Public Search",
    listing_url: "https://example.com/visual-qa-rent",
    source_display_type: "public_index_source",
    source_badge: "public_indexed",
    display_depth: "limited_preview",
    allowed_ctas: ["view_original"],
    thumbnail_policy: "single_thumbnail_allowed",
    original_source_required: true,
    source_attribution_label: "Source publique indexée",
    search_result_display_mode: "indexed_result",
    result_origin: "search_api",
    can_show_result: true,
    can_show_thumbnail: true,
    can_show_snippet: true,
    can_show_contact: false,
    can_show_gallery: false,
    primary_cta: "view_original",
    production_allowed: true,
    thumbnail_url: "https://images.example.com/visual-qa-third-party-thumbnail-must-not-render.jpg",
    can_cache_thumbnail: false,
    can_download_thumbnail: false,
  },
  {
    id: "visual-qa-indexed-new",
    title: "Projet neuf à vendre — Les Jardins d’Anfa",
    city: "Casablanca",
    neighborhood: "Anfa",
    price: 1200000,
    currency: "DH",
    surface_m2: 92,
    price_per_m2: 13043,
    property_type: "Appartement",
    transaction_type: "new",
    bedrooms: 2,
    bathrooms: 2,
    freshness_label: "Indexée récemment",
    source_type: "Source analysée",
    reliability_label: "Infos limitées",
    reliability_score: 68,
    is_mre_friendly: false,
    description: "Fixture visuelle public_indexed neuf.",
    image_url: "",
    reliability_explanation: "Fixture de certification visuelle.",
    source_name: "Common Crawl",
    listing_url: "https://example.com/visual-qa-new",
    source_display_type: "public_index_source",
    source_badge: "public_indexed",
    display_depth: "limited_preview",
    allowed_ctas: ["view_original"],
    thumbnail_policy: "no_listing_image",
    original_source_required: true,
    source_attribution_label: "Source publique indexée",
    search_result_display_mode: "indexed_result",
    result_origin: "search_api",
    can_show_result: true,
    can_show_thumbnail: false,
    can_show_snippet: true,
    can_show_contact: false,
    can_show_gallery: false,
    primary_cta: "view_original",
    production_allowed: true,
  },
];

export default function SearchIndexedCardsVisualQAPage() {
  return (
    <PropertySelectionProvider>
      <main className="min-h-screen bg-[#f7f9fc] px-2.5 py-4 sm:px-5 sm:py-6">
        <section className="mx-auto w-full max-w-[1180px]">
          <div className="mb-3 sm:mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2f63a4] sm:text-xs">
              Visual QA · carte structurée réelle
            </p>
            <h1 className="mt-1 text-lg font-black tracking-[-0.03em] text-slate-950 sm:text-2xl">
              Annonces indexées · Achat / Location / Neuf
            </h1>
            <p className="mt-1 max-w-2xl text-[11px] font-semibold leading-relaxed text-slate-500 sm:text-sm">
              Même composant que /search. Aucune photo tierce ne doit apparaître, y compris quand un thumbnail provider est présent.
            </p>
          </div>

          <div data-visual-qa-indexed-card-grid className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {INDEXED_LISTINGS.map((listing) => (
              <SearchListingCardDark key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      </main>
    </PropertySelectionProvider>
  );
}
