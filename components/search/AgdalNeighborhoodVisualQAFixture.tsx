"use client";

import type { CSSProperties } from "react";
import { NeighborhoodVisualIdentityOverlay } from "@/components/search/NeighborhoodVisualIdentityOverlay";
import { PropertySelectionProvider } from "@/components/search/PropertySelectionProvider";
import { SearchListingCardDark } from "@/components/search/SearchListingCardDark";
import { AGDAL_NEIGHBORHOOD_VISUALS } from "@/lib/contextual-illustrations/agdal-neighborhood-visuals";
import type { Listing } from "@/lib/listings/types";

const LOCAL_QA_ASSETS: Record<(typeof AGDAL_NEIGHBORHOOD_VISUALS)[number]["sceneRole"], string> = {
  signature: "/__qa/agdal-signature.jpg",
  immobilier: "/__qa/agdal-immobilier.jpg",
  lifestyle: "/__qa/agdal-lifestyle.jpg",
};

function qaListing(index: number, sceneRole: (typeof AGDAL_NEIGHBORHOOD_VISUALS)[number]["sceneRole"]): Listing {
  return {
    id: `agdal-visual-qa-${sceneRole}`,
    title: "Bien à Agdal — aperçu de certification",
    city: "Rabat",
    neighborhood: "Agdal",
    price: 2_750_000 + index * 180_000,
    currency: "DH",
    surface_m2: 128 + index * 12,
    price_per_m2: null,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 3,
    bathrooms: 2,
    freshness_label: "Source vérifiée",
    source_type: "Source analysée",
    reliability_label: "Infos limitées",
    reliability_score: 0,
    reliability_available: false,
    is_mre_friendly: false,
    description: "Fixture QA — le visuel d’ambiance ne représente aucune annonce immobilière précise.",
    image_url: "",
    reliability_explanation: "Fixture de certification visuelle uniquement.",
    listing_url: `https://example.com/qa/agdal/${sceneRole}`,
    source_name: "Fixture QA AkarFinder",
    source_display_type: "external_web_result",
    source_badge: "external_web_result",
    search_result_display_mode: "thin_indexed_result",
    result_origin: "search_api",
    original_source_required: true,
    allowed_ctas: ["view_original"],
    can_show_result: true,
    can_show_thumbnail: false,
    can_show_contact: false,
    can_show_gallery: false,
    production_allowed: true,
    display_images: { policy: "no_listing_image" },
    image_permission_status: "unknown",
    source_access_level: "indexed_only",
  };
}

function creditLabel(visual: (typeof AGDAL_NEIGHBORHOOD_VISUALS)[number]): string {
  if (visual.source.sourceKind === "project_supplied") {
    return `${visual.source.sourceName} · Autorisation directe`;
  }

  return `${visual.source.author} · ${visual.source.license} · ${visual.source.sourceName}`;
}

export function AgdalNeighborhoodVisualQAFixture() {
  return (
    <PropertySelectionProvider>
      <section data-agdal-visual-qa-grid className="grid grid-cols-2 gap-x-2.5 gap-y-6 lg:grid-cols-4 lg:gap-x-3">
        {AGDAL_NEIGHBORHOOD_VISUALS.map((visual, index) => {
          const qaSource = LOCAL_QA_ASSETS[visual.sceneRole];
          const style = { "--agdal-qa-source": `url(\"${qaSource}\")` } as CSSProperties;
          const credit = creditLabel(visual);
          const creditClassName = "mt-1.5 block truncate text-[8.5px] font-semibold text-muted-foreground/80 underline-offset-2 sm:text-[9px]";

          return (
            <div
              key={visual.id}
              data-agdal-qa-card
              data-scene-role={visual.sceneRole}
              data-visual-id={visual.id}
              data-source-license={visual.source.license}
              data-source-kind={visual.source.sourceKind}
              style={style}
              className="relative min-w-0 [&_[data-neighborhood-photo-credit]]:hidden [&_[data-neighborhood-photo-disclosure]]:hidden [&_[data-neighborhood-photo-title]]:hidden"
            >
              <SearchListingCardDark listing={qaListing(index, visual.sceneRole)} />
              <div
                data-agdal-template-a-layer
                className="pointer-events-none absolute left-px right-px top-px z-10 h-[163px] overflow-hidden rounded-t-[19px] sm:h-[195px] sm:rounded-t-[15px]"
              >
                <NeighborhoodVisualIdentityOverlay
                  neighborhood={visual.title}
                  city={visual.cityLabel}
                  descriptors={visual.descriptors}
                  disclosureLabel={visual.presentation.disclosureLabel}
                />
              </div>
              {visual.source.sourcePage ? (
                <a
                  href={visual.source.sourcePage}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-agdal-qa-credit
                  className={`${creditClassName} hover:underline`}
                >
                  {credit}
                </a>
              ) : (
                <span data-agdal-qa-credit className={creditClassName}>
                  {credit}
                </span>
              )}
            </div>
          );
        })}
      </section>
      <style jsx global>{`
        [data-agdal-qa-card] [data-card-image] > div:first-child { opacity: 0 !important; }
        [data-agdal-qa-card] [data-card-image]::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0;
          background-image: var(--agdal-qa-source);
          background-position: center;
          background-repeat: no-repeat;
          background-size: cover;
        }
        [data-agdal-qa-card] [data-card-image] > div:nth-child(3),
        [data-agdal-qa-card] [data-card-image] > span:not([data-neighborhood-photo-title]):not([data-neighborhood-photo-disclosure]) { z-index: 20; }
      `}</style>
    </PropertySelectionProvider>
  );
}
